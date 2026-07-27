import { formatCurrency } from './proposalTemplates';

/** Status padronizado do pipeline comercial */
export const PIPELINE = {
  negotiating: {
    id: 'negotiating',
    label: 'Em negociação',
    short: 'Negociação',
    hint: 'Proposta em andamento',
  },
  active: {
    id: 'active',
    label: 'Cliente ativo',
    short: 'Ativo',
    hint: 'Contrato em operação',
  },
  lost: {
    id: 'lost',
    label: 'Perdido',
    short: 'Perdido',
    hint: 'Negociamos e não fechamos',
  },
  churn: {
    id: 'churn',
    label: 'Churn',
    short: 'Churn',
    hint: 'Prestamos serviço e não renovaram',
  },
};

export const PIPELINE_TABS = [
  {
    id: 'negotiating',
    label: 'Em negociação',
    statuses: ['negotiating'],
  },
  {
    id: 'active',
    label: 'Clientes ativos',
    statuses: ['active'],
  },
  {
    id: 'lost',
    label: 'Perdidos',
    statuses: ['lost'],
  },
  {
    id: 'churn',
    label: 'Churn',
    statuses: ['churn'],
  },
];

/** Derive pipeline from proposal + contract */
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

export function pipelineLabel(status) {
  return PIPELINE[status]?.short || PIPELINE[status]?.label || status;
}

/** @deprecated use PIPELINE — mantido para telas antigas */
export const STAGE_LABELS = {
  draft: 'Em negociação',
  sent: 'Em negociação',
  won: 'Ativo',
  contract_active: 'Ativo',
  archived: 'Perdido',
  negotiating: 'Em negociação',
  active: 'Ativo',
  lost: 'Perdido',
  churn: 'Churn',
};

export function leadDisplayName(lead) {
  return (
    lead.client?.legalName ||
    lead.client?.tradeName ||
    lead.proposal?.clientName ||
    'Sem nome'
  );
}

export function proposalInvestmentSummary(proposal) {
  if (!proposal) return '—';
  if (proposal.template === 'blank') {
    const total = (proposal.blankItems || []).reduce(
      (s, i) => s + (Number(i.totalValue) || 0),
      0,
    );
    return total ? formatCurrency(total) : '—';
  }
  const parts = [];
  if (proposal.setupEnabled && proposal.setupPrice) {
    parts.push(`${formatCurrency(proposal.setupPrice)} setup`);
  }
  if (proposal.operationEnabled && proposal.operationPrice) {
    parts.push(`${formatCurrency(proposal.operationPrice)}/mês`);
  }
  return parts.join(' · ') || '—';
}

export function formatEntryStatus(status) {
  const map = {
    scheduled: 'Previsto',
    received: 'Recebido',
    paid: 'Pago',
    overdue: 'Atrasado',
    cancelled: 'Cancelado',
  };
  return map[status] || status;
}

/** Parse DD/MM/YYYY or ISO → Date or null */
export function parseBRDate(value) {
  if (!value) return null;
  const br = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  }
  const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Lifetime em meses desde o início do contrato */
export function clientLifetimeMonths(startDate, now = new Date()) {
  const start = parseBRDate(startDate);
  if (!start) return null;
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

/** LTV = soma de receitas já recebidas do contrato */
export function clientLtv(entries = []) {
  return entries
    .filter(
      (e) =>
        e.type === 'income' &&
        (e.status === 'received' || e.status === 'paid'),
    )
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

/** Map pipeline → proposal.status persisted */
export function proposalStatusFromPipeline(pipeline) {
  const map = {
    negotiating: 'draft',
    active: 'won',
    lost: 'lost',
    churn: 'churn',
  };
  return map[pipeline] || 'draft';
}

function leadStatus(lead) {
  return (
    lead.pipelineStatus ||
    resolvePipelineStatus(lead.proposal, lead.contract)
  );
}

function proposalDealValue(proposal) {
  if (!proposal) return 0;
  if (proposal.template === 'blank') {
    return (proposal.blankItems || []).reduce(
      (s, i) => s + (Number(i.totalValue) || 0),
      0,
    );
  }
  let total = 0;
  if (proposal.setupEnabled) total += Number(proposal.setupPrice) || 0;
  if (proposal.operationEnabled) total += Number(proposal.operationPrice) || 0;
  return total;
}

/** Fee contratado (contrato, com fallback na proposta) */
export function contractedFee(lead) {
  const c = lead?.contract;
  if (c?.feeEnabled) return Number(c.feePrice) || 0;
  if (lead?.proposal?.operationEnabled) {
    return Number(lead.proposal.operationPrice) || 0;
  }
  return 0;
}

/** Fee vigente segundo o livro-caixa (agenda de recebíveis) */
export function ledgerFee(lead) {
  return Number(lead?.finance?.mrr) || 0;
}

/** Visão geral do pipeline comercial a partir dos leads */
export function buildComercialDashboard(leads = []) {
  const buckets = {
    negotiating: [],
    active: [],
    lost: [],
    churn: [],
  };

  for (const lead of leads) {
    const status = leadStatus(lead);
    if (buckets[status]) buckets[status].push(lead);
    else buckets.negotiating.push(lead);
  }

  const pipelineValue = buckets.negotiating.reduce(
    (s, l) => s + proposalDealValue(l.proposal),
    0,
  );

  const closedDeals = buckets.active.length + buckets.lost.length;
  const winRate =
    closedDeals > 0
      ? Math.round((buckets.active.length / closedDeals) * 100)
      : null;

  const served = buckets.active.length + buckets.churn.length;
  const churnRate =
    served > 0 ? Math.round((buckets.churn.length / served) * 100) : null;

  const activeContracts = buckets.active.filter((l) => l.contract?.id).length;

  // Funil comercial = negociação → fechado (ativo) ou perdido (sem churn)
  const funnelStages = [
    {
      id: 'negotiating',
      label: 'Negociação',
      count: buckets.negotiating.length,
    },
    {
      id: 'active',
      label: 'Ativos',
      count: buckets.active.length,
    },
    {
      id: 'lost',
      label: 'Perdidos',
      count: buckets.lost.length,
    },
  ];
  const funnelTotal = funnelStages.reduce((s, m) => s + m.count, 0) || 1;
  const mix = funnelStages.map((m) => ({
    ...m,
    pct: Math.round((m.count / funnelTotal) * 100),
  }));

  return {
    counts: {
      negotiating: buckets.negotiating.length,
      active: buckets.active.length,
      lost: buckets.lost.length,
      churn: buckets.churn.length,
      total: leads.length,
      funnel:
        buckets.negotiating.length +
        buckets.active.length +
        buckets.lost.length,
      activeContracts,
    },
    pipelineValue,
    winRate,
    churnRate,
    mix,
    funnelStages,
  };
}

/** Ordem do fluxo no painel do lead */
export const LEAD_FLOW_STEPS = [
  { id: 'proposta', label: 'Proposta', sec: 'proposta' },
  { id: 'cliente', label: 'Cliente', sec: 'cliente' },
  { id: 'contrato', label: 'Contrato', sec: 'contrato' },
  { id: 'assinatura', label: 'Assinatura', sec: 'assinatura' },
  { id: 'financeiro', label: 'Financeiro', sec: 'financeiro' },
];

/**
 * Resolve progresso do lead e o próximo passo sugerido.
 * @returns {{
 *   steps: Array<{id:string,label:string,sec:string,done:boolean,current:boolean}>,
 *   nextSec: string,
 *   nextLabel: string,
 *   nextHint: string,
 *   currentStepId: string
 * }}
 */
export function resolveLeadProgress(lead) {
  const proposal = lead?.proposal;
  const client = lead?.client;
  const contract = lead?.contract;

  const hasProposal = Boolean(
    proposal?.id &&
      (String(proposal.title || '').trim() ||
        String(proposal.clientName || '').trim() ||
        proposal.number),
  );
  const hasClient = Boolean(
    client?.id && String(client.email || '').trim(),
  );
  const hasClientPartial = Boolean(client?.id);
  const hasContract = Boolean(contract?.id);
  const isSigned =
    Boolean(contract?.signedAt) ||
    contract?.status === 'signed' ||
    Boolean(contract?.signature?.signed);
  const isSent =
    isSigned ||
    contract?.status === 'sent' ||
    Boolean(contract?.signingToken) ||
    Boolean(contract?.signature?.hasActiveToken);

  const doneMap = {
    proposta: hasProposal,
    cliente: hasClient,
    contrato: hasContract,
    assinatura: isSigned,
    financeiro: hasContract,
  };

  let nextSec = 'proposta';
  let nextLabel = 'Proposta';
  let nextHint = 'Revise e finalize a proposta comercial.';
  let currentStepId = 'proposta';

  if (!hasProposal) {
    nextSec = 'proposta';
    nextLabel = 'Completar proposta';
    nextHint = 'Preencha a proposta antes de cadastrar o cliente.';
    currentStepId = 'proposta';
  } else if (!hasClientPartial) {
    nextSec = 'cliente';
    nextLabel = 'Cadastrar cliente';
    nextHint = 'Cadastre o cliente (com e-mail) para gerar o contrato.';
    currentStepId = 'cliente';
  } else if (!hasClient) {
    nextSec = 'cliente';
    nextLabel = 'Completar e-mail do cliente';
    nextHint = 'O e-mail é necessário para enviar o contrato para assinatura.';
    currentStepId = 'cliente';
  } else if (!hasContract) {
    nextSec = 'contrato';
    nextLabel = 'Gerar contrato';
    nextHint = 'Gere o contrato a partir da proposta e da remuneração.';
    currentStepId = 'contrato';
  } else if (!isSigned) {
    nextSec = 'assinatura';
    nextLabel = isSent ? 'Aguardando assinatura' : 'Enviar para assinatura';
    nextHint = isSent
      ? 'O contrato foi enviado. Acompanhe a assinatura do cliente.'
      : 'Envie o contrato por e-mail para o cliente assinar.';
    currentStepId = 'assinatura';
  } else {
    nextSec = 'financeiro';
    nextLabel = 'Ver financeiro';
    nextHint = 'Contrato assinado. Acompanhe a agenda de recebíveis.';
    currentStepId = 'financeiro';
  }

  const steps = LEAD_FLOW_STEPS.map((step) => ({
    ...step,
    done: Boolean(doneMap[step.id]),
    current: step.id === currentStepId,
  }));

  return {
    steps,
    nextSec,
    nextLabel,
    nextHint,
    currentStepId,
  };
}
