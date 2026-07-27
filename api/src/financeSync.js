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

function monthsFrom(start, count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(new Date(start.getFullYear(), start.getMonth() + i, 1));
  }
  return out;
}

/**
 * Build scheduled finance entries from a contract (does not persist).
 * horizonMonths: how many monthly fee/commission entries to create.
 */
export function buildContractSchedule(contract, categoriesByKey = {}, horizonMonths = 12) {
  const start = parseBRDate(contract.startDate) || new Date();
  const setupDueDays = Number(contract.setupDueDays) || 0;
  const feePayDay = Number(contract.feePayDay) || 5;
  const commissionPayDay = Number(contract.commissionPayDay) || 6;
  const groupId = contract.id || randomUUID();
  const entries = [];

  if (contract.setupEnabled && Number(contract.setupPrice) > 0) {
    const due = addDays(start, setupDueDays);
    entries.push({
      type: 'income',
      origin: 'contract_setup',
      status: 'scheduled',
      amount: Number(contract.setupPrice) || 0,
      dueDate: formatBRDate(due),
      paidAt: null,
      description: `${contract.setupTitle || 'Setup'} — ${contract.number || ''}`.trim(),
      categoryId: categoriesByKey.setup || null,
      clientId: contract.clientId || null,
      contractId: contract.id || null,
      proposalId: contract.proposalId || null,
      recurrenceGroupId: `${groupId}:setup`,
      notes: '',
    });
  }

  if (contract.feeEnabled && Number(contract.feePrice) > 0) {
    for (const monthStart of monthsFrom(start, horizonMonths)) {
      const day = clampDay(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        feePayDay,
      );
      const due = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      // Skip fee in the start month if start day is after pay day? Keep inclusive from start month.
      if (due < addDays(start, -0)) {
        // still include if same month
      }
      entries.push({
        type: 'income',
        origin: 'contract_fee',
        status: 'scheduled',
        amount: Number(contract.feePrice) || 0,
        dueDate: formatBRDate(due),
        paidAt: null,
        description: `${contract.feeTitle || 'Fee mensal'} — ${contract.number || ''}`.trim(),
        categoryId: categoriesByKey.fee || null,
        clientId: contract.clientId || null,
        contractId: contract.id || null,
        proposalId: contract.proposalId || null,
        recurrenceGroupId: `${groupId}:fee`,
        notes: '',
      });
    }
  }

  if (contract.commissionEnabled) {
    const estimate = Number(contract.commissionEstimate) || 0;
    for (const monthStart of monthsFrom(start, horizonMonths)) {
      const day = clampDay(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        commissionPayDay,
      );
      const due = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      entries.push({
        type: 'income',
        origin: 'contract_commission',
        status: 'scheduled',
        amount: estimate,
        dueDate: formatBRDate(due),
        paidAt: null,
        description: `Comissão — ${contract.number || ''}`.trim(),
        categoryId: categoriesByKey.commission || null,
        clientId: contract.clientId || null,
        contractId: contract.id || null,
        proposalId: contract.proposalId || null,
        recurrenceGroupId: `${groupId}:commission`,
        notes: 'Valor estimado — ajuste conforme faturamento real',
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
  if (
    explicit &&
    ['negotiating', 'active', 'lost', 'churn'].includes(explicit)
  ) {
    return explicit;
  }
  const ps = proposal?.status;
  if (ps === 'lost') return 'lost';
  if (ps === 'churn') return 'churn';
  if (ps === 'archived') return 'lost';
  if (contract?.status === 'cancelled' || contract?.status === 'churn') {
    return 'churn';
  }
  if (contract && ['active', 'signed'].includes(contract.status)) {
    return 'active';
  }
  if (ps === 'won') return 'active';
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
