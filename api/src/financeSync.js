import { randomUUID } from 'crypto';

/** Parse dd/mm/yyyy or yyyy-mm-dd → Date (local) */
export function parseBRDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const d = Number(br[1]);
    const m = Number(br[2]);
    const y = Number(br[3]);
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatBRDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : parseBRDate(date);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function toISODate(date) {
  const d = date instanceof Date ? date : parseBRDate(date);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function clampDay(year, monthIndex, day) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(1, day), last);
}

function addDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Build scheduled finance entries from a contract (does not persist).
 * Setup + fee only. Commission is issued manually via Asaas.
 */
export function buildContractSchedule(
  contract,
  categoriesByKey = {},
  horizonMonths = 12,
  clientName = '',
) {
  const start = parseBRDate(contract.startDate) || new Date();
  const setupDueDays = Number(contract.setupDueDays) || 0;
  const feePayDay = Number(contract.feePayDay) || 5;
  const groupId = contract.id || randomUUID();
  const entries = [];
  const who = String(clientName || '').trim();
  const label = (title, number) =>
    [who || null, title || null, number || null].filter(Boolean).join(' · ');

  const setupDue =
    parseBRDate(contract.setupDueDate) || addDays(start, setupDueDays);
  const feeFirst =
    parseBRDate(contract.feeFirstDueDate) ||
    new Date(
      start.getFullYear(),
      start.getMonth(),
      clampDay(start.getFullYear(), start.getMonth(), feePayDay),
    );

  if (contract.setupEnabled && Number(contract.setupPrice) > 0) {
    entries.push({
      type: 'income',
      origin: 'contract_setup',
      status: 'scheduled',
      amount: Number(contract.setupPrice) || 0,
      dueDate: formatBRDate(setupDue),
      paidAt: null,
      description: label(
        contract.setupTitle || 'Setup',
        contract.number || '',
      ),
      categoryId: categoriesByKey.setup || null,
      clientId: contract.clientId || null,
      contractId: contract.id || null,
      proposalId: contract.proposalId || null,
      recurrenceGroupId: `${groupId}:setup`,
      notes: '',
      billingType: contract.asaasBillingType || '',
    });
  }

  if (contract.feeEnabled && Number(contract.feePrice) > 0) {
    const feeDay = feeFirst.getDate();
    for (let i = 0; i < horizonMonths; i += 1) {
      const monthStart = new Date(
        feeFirst.getFullYear(),
        feeFirst.getMonth() + i,
        1,
      );
      const day = clampDay(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        feeDay,
      );
      const due = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        day,
      );
      entries.push({
        type: 'income',
        origin: 'contract_fee',
        status: 'scheduled',
        amount: Number(contract.feePrice) || 0,
        dueDate: formatBRDate(due),
        paidAt: null,
        description: label(
          contract.feeTitle || 'Fee mensal',
          contract.number || '',
        ),
        categoryId: categoriesByKey.fee || null,
        clientId: contract.clientId || null,
        contractId: contract.id || null,
        proposalId: contract.proposalId || null,
        recurrenceGroupId: `${groupId}:fee`,
        notes: '',
        billingType: contract.asaasBillingType || '',
      });
    }
  }

  return entries;
}

export function todayISO() {
  return toISODate(new Date());
}

export function resolveEntryStatus(entry, today = new Date()) {
  if (['received', 'paid', 'cancelled'].includes(entry.status)) return entry.status;
  const due = parseBRDate(entry.dueDate);
  if (due && due < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    return 'overdue';
  }
  return 'scheduled';
}

/** Pipeline comercial: negotiating | active | lost | churn */
export function resolvePipelineStatus(proposal, contract) {
  const explicit = proposal?.pipelineStatus;
  const ps = proposal?.status;

  if (explicit === 'lost' || ps === 'lost' || ps === 'archived') return 'lost';
  if (
    explicit === 'churn' ||
    ps === 'churn' ||
    contract?.status === 'churn'
  ) {
    return 'churn';
  }
  if (contract?.status === 'cancelled') return 'lost';

  // Cliente ativo só após assinatura do contrato
  const signed =
    Boolean(contract?.signedAt) || contract?.status === 'signed';
  if (signed) return 'active';

  // Contrato gerado/enviado, ainda sem assinatura → permanece em negociação
  if (contract?.id) return 'negotiating';

  if (
    explicit &&
    ['negotiating', 'active', 'lost', 'churn'].includes(explicit)
  ) {
    return explicit === 'active' ? 'negotiating' : explicit;
  }
  return 'negotiating';
}

/** Pipeline comercial → status persistido no contrato */
export function contractStatusFromPipeline(pipeline) {
  const map = {
    negotiating: 'draft',
    active: 'active',
    lost: 'cancelled',
    churn: 'churn',
  };
  return map[pipeline] || null;
}

/** Pipelines que encerram a operação e não devem gerar novos recebíveis */
export const CLOSED_PIPELINES = ['lost', 'churn'];

const CONTRACT_ORIGINS = [
  'contract_setup',
  'contract_fee',
  'contract_commission',
];

export function isContractOrigin(origin) {
  return CONTRACT_ORIGINS.includes(origin);
}

/**
 * Resumo financeiro de um lead a partir dos lançamentos (livro-caixa).
 * mrr = fee recorrente vigente segundo a agenda; ltv = receita já recebida.
 */
export function summarizeLeadFinance(entries = [], today = new Date()) {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const monthKey = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;

  let ltv = 0;
  let openTotal = 0;
  let overdueTotal = 0;
  let receivedCount = 0;
  let monthFee = 0;
  let nextFee = 0;
  let nextFeeDate = null;

  for (const raw of entries) {
    if (raw.type !== 'income') continue;
    const status = resolveEntryStatus(raw, base);
    if (status === 'cancelled') continue;
    const amount = Number(raw.amount) || 0;

    if (status === 'received' || status === 'paid') {
      ltv += amount;
      receivedCount += 1;
    } else {
      openTotal += amount;
      if (status === 'overdue') overdueTotal += amount;
    }

    if (raw.origin === 'contract_fee') {
      const iso = toISODate(parseBRDate(raw.dueDate));
      if (!iso) continue;
      if (iso.slice(0, 7) === monthKey) monthFee += amount;
      const isFuture = iso >= toISODate(base);
      if (isFuture && (!nextFeeDate || iso < nextFeeDate)) {
        nextFeeDate = iso;
        nextFee = amount;
      }
    }
  }

  return {
    mrr: monthFee || nextFee,
    monthFee,
    nextFee,
    nextFeeDate,
    ltv,
    openTotal,
    overdueTotal,
    receivedCount,
  };
}

/** Legacy stage label for older UI */
export function resolveLegacyStage(proposal, contract) {
  const pipeline = resolvePipelineStatus(proposal, contract);
  if (pipeline === 'lost') return 'archived';
  if (pipeline === 'churn') return 'archived';
  if (pipeline === 'active') {
    return contract && ['active', 'signed'].includes(contract.status)
      ? 'contract_active'
      : 'won';
  }
  if (proposal?.status === 'sent') return 'sent';
  return 'draft';
}

export const DEFAULT_FINANCE_CATEGORIES = [
  { name: 'Fee mensal', kind: 'income', system: true, key: 'fee' },
  { name: 'Setup', kind: 'income', system: true, key: 'setup' },
  { name: 'Comissão', kind: 'income', system: true, key: 'commission' },
  { name: 'Outras receitas', kind: 'income', system: true, key: 'other_income' },
  { name: 'Marketing', kind: 'expense', system: true, key: 'marketing' },
  { name: 'Folha', kind: 'expense', system: true, key: 'payroll' },
  { name: 'Ferramentas', kind: 'expense', system: true, key: 'tools' },
  { name: 'Impostos', kind: 'expense', system: true, key: 'taxes' },
  { name: 'Outras despesas', kind: 'expense', system: true, key: 'other_expense' },
];
