import { asaasConfigured, listPayments } from '../asaas/client.js';

const RECEIVED_STATUSES = ['RECEIVED', 'RECEIVED_IN_CASH', 'CONFIRMED'];

const DEFAULT_RECURRING = [
  { section: 'tools', name: 'Google Workspace', amount: 77, sortOrder: 10 },
  { section: 'tools', name: 'CRM', amount: 98, sortOrder: 20 },
  { section: 'tools', name: 'VPS', amount: 60, sortOrder: 30 },
  { section: 'tools', name: 'Cursor', amount: 110, sortOrder: 40 },
  { section: 'tools', name: 'Ferramentas Bruno', amount: 200, sortOrder: 50 },
  { section: 'prolabore', name: 'Sócio 1', amount: 0, sortOrder: 10 },
  { section: 'prolabore', name: 'Sócio 2', amount: 0, sortOrder: 20 },
];

export function defaultDreSettings() {
  return {
    simplesRate: 0.06,
    reserveMarketingRate: 0.1,
    reserveWorkingRate: 0.15,
    reserveExpansionRate: 0.05,
    periodStartDay: 1,
  };
}

export function defaultRecurringCosts() {
  return DEFAULT_RECURRING.map((r) => ({ ...r, active: true }));
}

/** Mês comercial: se periodStartDay=3 e month=2026-08 → 03/08 a 02/09 (ou 31/08 se day=1). */
export function monthRange(yearMonth, periodStartDay = 1) {
  const m = String(yearMonth || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    return monthRange(`${y}-${mo}`, periodStartDay);
  }
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const startDay = Math.min(Math.max(Number(periodStartDay) || 1, 1), 28);

  if (startDay <= 1) {
    const from = `${m[1]}-${m[2]}-01`;
    const last = new Date(year, month, 0).getDate();
    const to = `${m[1]}-${m[2]}-${String(last).padStart(2, '0')}`;
    return { from, to, yearMonth: `${m[1]}-${m[2]}` };
  }

  const from = `${m[1]}-${m[2]}-${String(startDay).padStart(2, '0')}`;
  let nextY = year;
  let nextM = month + 1;
  if (nextM > 12) {
    nextM = 1;
    nextY += 1;
  }
  const endDay = startDay - 1;
  const to = `${nextY}-${String(nextM).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
  return { from, to, yearMonth: `${m[1]}-${m[2]}` };
}

function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function estimateAsaasFee(payment) {
  const type = String(payment.billingType || '').toUpperCase();
  if (type === 'BOLETO') return 0.99;
  if (type === 'PIX') return 0.99;
  if (type === 'CREDIT_CARD') {
    const v = Number(payment.value) || 0;
    return money(Math.max(0.49, v * 0.0299));
  }
  return 0.99;
}

async function fetchReceivedPayments(from, to) {
  if (!asaasConfigured()) return [];
  const collected = [];
  for (const status of RECEIVED_STATUSES) {
    let offset = 0;
    let hasMore = true;
    while (hasMore && offset < 500) {
      const page = await listPayments({
        status,
        'paymentDate[ge]': from,
        'paymentDate[le]': to,
        limit: 100,
        offset,
      });
      const data = Array.isArray(page?.data) ? page.data : [];
      collected.push(...data);
      hasMore = Boolean(page?.hasMore);
      offset += data.length || 100;
      if (!data.length) break;
    }
  }
  // dedupe by id
  const byId = new Map();
  for (const p of collected) {
    if (p?.id) byId.set(p.id, p);
  }
  return [...byId.values()];
}

function categoryMatches(cat, keys, nameRe) {
  if (!cat) return false;
  const key = String(cat.key || '').toLowerCase();
  const name = String(cat.name || '').toLowerCase();
  if (keys.some((k) => key === k)) return true;
  return nameRe.test(name);
}

/**
 * @param {object} store
 * @param {{ month?: string }} opts
 */
export async function buildDre(store, opts = {}) {
  const settings =
    (await store.getDreSettings?.()) || defaultDreSettings();
  let recurring =
    (await store.listRecurringCosts?.()) || [];
  if (!recurring.length && store.ensureRecurringCostsSeeded) {
    await store.ensureRecurringCostsSeeded();
    recurring = (await store.listRecurringCosts?.()) || [];
  }

  const { from, to, yearMonth } = monthRange(
    opts.month,
    settings.periodStartDay,
  );
  const overrides =
    (await store.getDreMonthOverride?.(yearMonth)) || {};

  let payments = [];
  let asaasConfiguredFlag = asaasConfigured();
  try {
    payments = await fetchReceivedPayments(from, to);
  } catch (err) {
    asaasConfiguredFlag = asaasConfigured();
    payments = [];
    console.error('DRE Asaas fetch failed:', err.message);
  }

  const revenueLines = payments.map((p) => {
    const value = money(p.value);
    const net = money(p.netValue);
    const fee =
      net > 0 && value >= net
        ? money(value - net)
        : estimateAsaasFee(p);
    return {
      id: p.id,
      description: p.description || `Cobrança ${p.id}`,
      value,
      netValue: net,
      fee,
      billingType: p.billingType || '',
      paymentDate: p.paymentDate || p.confirmedDate || '',
      customer: p.customer || '',
    };
  });

  const receitaBruta = money(
    revenueLines.reduce((s, l) => s + l.value, 0),
  );
  let taxasAsaas = money(
    revenueLines.reduce((s, l) => s + l.fee, 0),
  );
  if (overrides.asaasFeesTotal != null && overrides.asaasFeesTotal !== '') {
    taxasAsaas = money(overrides.asaasFeesTotal);
  }

  const simplesRate = Number(settings.simplesRate) || 0;
  const simples = money(receitaBruta * simplesRate);

  const cats = (await store.listFinanceCategories?.()) || [];
  const entries = (await store.listFinanceEntries?.({
    type: 'expense',
    from,
    to,
  })) || [];

  const toolsCatIds = new Set(
    cats
      .filter((c) => categoryMatches(c, ['tools'], /ferramenta/i))
      .map((c) => c.id),
  );
  const payrollCatIds = new Set(
    cats
      .filter((c) =>
        categoryMatches(c, ['payroll'], /folha|pr[oó]-?labore|prolabore/i),
      )
      .map((c) => c.id),
  );
  const taxCatIds = new Set(
    cats
      .filter((c) => categoryMatches(c, ['taxes'], /imposto/i))
      .map((c) => c.id),
  );

  const paidExpense = (e) =>
    ['paid', 'received'].includes(e.status) ||
    // despesas manuais scheduled no mês também contam como previstas
    e.origin === 'manual';

  const extraTools = entries
    .filter((e) => paidExpense(e) && toolsCatIds.has(e.categoryId))
    .map((e) => ({
      id: e.id,
      name: e.description || 'Despesa ferramentas',
      amount: money(e.amount),
      source: 'entry',
    }));
  const extraPayroll = entries
    .filter((e) => paidExpense(e) && payrollCatIds.has(e.categoryId))
    .map((e) => ({
      id: e.id,
      name: e.description || 'Pró-labore / folha',
      amount: money(e.amount),
      source: 'entry',
    }));
  const extraTaxes = entries
    .filter((e) => paidExpense(e) && taxCatIds.has(e.categoryId))
    .reduce((s, e) => s + money(e.amount), 0);

  const toolLines = [
    ...recurring
      .filter((r) => r.section === 'tools' && r.active !== false)
      .map((r) => ({
        id: r.id,
        name: r.name,
        amount: money(r.amount),
        source: 'recurring',
        section: 'tools',
      })),
    ...extraTools,
  ];
  const prolaboreLines = [
    ...recurring
      .filter((r) => r.section === 'prolabore' && r.active !== false)
      .map((r) => ({
        id: r.id,
        name: r.name,
        amount: money(r.amount),
        source: 'recurring',
        section: 'prolabore',
      })),
    ...extraPayroll,
  ];

  const totalFerramentas = money(
    toolLines.reduce((s, l) => s + l.amount, 0),
  );
  const totalProlabore = money(
    prolaboreLines.reduce((s, l) => s + l.amount, 0),
  );
  const totalImpostosTaxas = money(simples + taxasAsaas + extraTaxes);

  const resultadoOperacional = money(
    receitaBruta - totalImpostosTaxas - totalFerramentas,
  );
  const lucroLiquido = money(resultadoOperacional - totalProlabore);

  const rMkt = Number(settings.reserveMarketingRate) || 0;
  const rWork = Number(settings.reserveWorkingRate) || 0;
  const rExp = Number(settings.reserveExpansionRate) || 0;

  const reserveLines = [
    {
      key: 'marketing',
      name: `Marketing (${Math.round(rMkt * 100)}%)`,
      rate: rMkt,
      amount: money(receitaBruta * rMkt),
    },
    {
      key: 'working',
      name: `Capital de Giro (${Math.round(rWork * 100)}%)`,
      rate: rWork,
      amount: money(receitaBruta * rWork),
    },
    {
      key: 'expansion',
      name: `Expansão da Empresa (${Math.round(rExp * 100)}%)`,
      rate: rExp,
      amount: money(receitaBruta * rExp),
    },
  ];
  const totalReservas = money(
    reserveLines.reduce((s, l) => s + l.amount, 0),
  );
  const caixaLivre = money(lucroLiquido - totalReservas);

  const formatBR = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  return {
    month: yearMonth,
    period: { from, to, label: `${formatBR(from)} a ${formatBR(to)}` },
    asaasConfigured: asaasConfiguredFlag,
    settings,
    revenues: revenueLines,
    receitaBruta,
    taxes: {
      simples: { rate: simplesRate, amount: simples },
      asaasFees: { amount: taxasAsaas, estimated: overrides.asaasFeesTotal == null },
      extraTaxes: money(extraTaxes),
      total: totalImpostosTaxas,
    },
    tools: { lines: toolLines, total: totalFerramentas },
    resultadoOperacional,
    prolabore: { lines: prolaboreLines, total: totalProlabore },
    lucroLiquido,
    reserves: { lines: reserveLines, total: totalReservas },
    caixaLivre,
    summary: {
      receitaBruta,
      impostosTaxas: totalImpostosTaxas,
      ferramentas: totalFerramentas,
      prolabore: totalProlabore,
      lucroLiquido,
      reservas: totalReservas,
      caixaLivre,
    },
    recurring,
  };
}
