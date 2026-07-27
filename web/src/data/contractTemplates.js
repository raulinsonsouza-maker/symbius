import { formatCurrency, resolveServiceNames } from './proposalTemplates';

export const DEFAULT_OBJECTIVE =
  'Prestação de serviços de planejamento, configuração, gestão, monitoramento e otimização de campanhas de tráfego pago nas plataformas Meta Ads e Google Ads, com análise de aquisição, direcionamento de criativos e acompanhamento do funil comercial, em regime de obrigação de meio.';

export const DEFAULT_SCOPE = [
  'Análise inicial da operação de aquisição e mensuração (contas, pixels, tags, CRM/BI quando existentes)',
  'Planejamento e gestão de mídia paga (estratégia, configuração, monitoramento e otimizações)',
  'Direcionamento de criativos via briefings ao time interno da CONTRATANTE',
  'Análise do fluxo de leads e vendas no CRM/BI para orientar ajustes de mídia',
  'Reunião de acompanhamento no intervalo definido neste contrato',
];

export const DEFAULT_PROVIDER_RESPONSIBILITIES = [
  'Executar os serviços com diligência técnica, observando escopo, orçamento aprovado e políticas das plataformas',
  'Fornecer briefings e direcionamentos de criativos ao time indicado pela CONTRATANTE',
  'Informar, em prazo razoável, problemas de rastreamento, contas, anúncios, verba ou criativos',
  'Manter sigilo sobre acessos, informações estratégicas e dados pessoais',
];

export const DEFAULT_CLIENT_RESPONSIBILITIES = [
  'Disponibilizar acessos administrativos às contas e dados necessários à operação',
  'Investir a verba de mídia acordada, paga diretamente às plataformas',
  'Produzir e entregar criativos solicitados nos briefings, nos prazos acordados',
  'Manter CRM e relatórios comerciais atualizados para atribuição de resultados',
  'Gerenciar integralmente a operação comercial e operacional do negócio',
];

export const DEFAULT_OUT_OF_SCOPE = [
  'Diagnóstico completo de marca, pesquisa formal de público ou reposicionamento',
  'Produção final de criativos, fotos, vídeos ou landing pages',
  'Gestão de redes sociais orgânicas, influenciadores ou assessoria de imprensa',
  'Desenvolvimento ou correção de site, CRM, BI, ERP, integrações ou automações',
  'Atendimento comercial, fechamento de vendas, cobrança ou pós-venda',
  'Verba de mídia e garantia de resultados comerciais específicos',
];

export const DEFAULT_MEETING_TOPICS = [
  'Revisão de indicadores de desempenho',
  'Análise do funil e qualidade das oportunidades',
  'Definição de prioridades e próximos testes',
  'Alinhamento de criativos, verba e hipóteses',
];

export const DEFAULT_IMPORTANT_NOTES = [
  'O serviço constitui obrigação de meio, e não de resultado.',
  'A verba de mídia, quando houver, não integra a remuneração da CONTRATADA.',
  'Alterações relevantes de escopo, canais ou modelo de remuneração dependem de aditivo ou aceite escrito.',
];

export const DEFAULT_COMMISSION_TIERS = [
  { from: 0, to: 30000, percent: 10 },
  { from: 30000, to: 60000, percent: 8 },
  { from: 60000, to: null, percent: 6 },
];

export const DEFAULT_COMMISSION_EXAMPLE_REVENUES = [25000, 50000, 80000, 120000];

function todayBR() {
  return new Date().toLocaleDateString('pt-BR');
}

function pickCommissionPercent(revenue, tiers = []) {
  const sorted = [...tiers].sort((a, b) => (a.from || 0) - (b.from || 0));
  for (const tier of sorted) {
    const from = Number(tier.from) || 0;
    const to = tier.to == null || tier.to === '' ? Infinity : Number(tier.to);
    if (revenue >= from && revenue <= to) return Number(tier.percent) || 0;
  }
  const last = sorted[sorted.length - 1];
  return last ? Number(last.percent) || 0 : 0;
}

export function buildContractDraft(proposal, settings = {}, services = []) {
  const setupServices = resolveServiceNames(proposal?.setupServiceIds, services);
  const operationServices = resolveServiceNames(
    proposal?.operationServiceIds,
    services,
  );

  const scopeFromProposal = [
    ...(proposal?.scopeItems || []),
    ...setupServices,
    ...operationServices,
  ].filter(Boolean);

  const scopeItems = Array.from(new Set(scopeFromProposal));

  const setupEnabled = Boolean(proposal?.setupEnabled);
  const feeEnabled = Boolean(proposal?.operationEnabled);
  const mediaEnabled = Boolean(proposal?.trafficEnabled);

  const company = settings?.legalName || settings?.companyName || 'Symbius';
  const clientLabel = proposal?.clientName || 'o contratante';

  return {
    title:
      proposal?.title ||
      'INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS',
    subtitle:
      proposal?.subtitle ||
      'GESTÃO DE TRÁFEGO PAGO, PERFORMANCE E REMUNERAÇÃO CONTRATUAL',
    startDate: todayBR(),
    minTermDays: 90,
    meetingCadenceDays: 15,
    objective: DEFAULT_OBJECTIVE,
    scopeItems: scopeItems.length ? scopeItems : [...DEFAULT_SCOPE],
    providerResponsibilities: [...DEFAULT_PROVIDER_RESPONSIBILITIES],
    clientResponsibilities: [...DEFAULT_CLIENT_RESPONSIBILITIES],
    outOfScope: [...DEFAULT_OUT_OF_SCOPE],
    meetingTopics: [...DEFAULT_MEETING_TOPICS],
    importantNotes: [...DEFAULT_IMPORTANT_NOTES],

    setupEnabled,
    setupTitle: proposal?.setupTitle || 'Investimento de setup',
    setupPrice: Number(proposal?.setupPrice) || 0,
    setupDescription:
      proposal?.setupFooter ||
      'Investimento único para estruturação inicial do projeto.',

    feeEnabled,
    feeTitle: proposal?.operationTitle || 'Fee mensal',
    feePrice: Number(proposal?.operationPrice) || 0,
    feeDescription:
      proposal?.operationFooter ||
      'Remuneração mensal pela operação contínua contratada.',

    commissionEnabled: false,
    commissionBaseLabel: 'Receita Bruta Atribuída',
    commissionTiers: [...DEFAULT_COMMISSION_TIERS],
    commissionCloseDay: 5,
    commissionPayDay: 6,
    commissionExamples: [],

    mediaEnabled,
    mediaMonthlyBudget: Number(proposal?.trafficPrice) || 0,
    mediaNotes: `A verba de mídia será paga diretamente por ${clientLabel} às plataformas utilizadas e não integra a remuneração da ${company}.`,

    feePayDay: 5,
    setupDueDays: 0,
    commissionEstimate: 0,
    setupDueDate: todayBR(),
    feeFirstDueDate: todayBR(),
    asaasBillingType: 'UNDEFINED',

    acceptanceProviderName: company,
    acceptanceClientName: proposal?.clientName || '',
    status: 'draft',
  };
}

export function commissionRangeLabel(tier) {
  const from = Number(tier.from) || 0;
  if (tier.to == null || tier.to === '') {
    return `Acima de ${formatCurrency(from)}`;
  }
  if (from === 0) {
    return `Até ${formatCurrency(tier.to)}`;
  }
  return `De ${formatCurrency(from + 0.01)} até ${formatCurrency(tier.to)}`;
}

export function buildCommissionExamples(tiers = []) {
  return DEFAULT_COMMISSION_EXAMPLE_REVENUES.map((revenue) => {
    const percent = pickCommissionPercent(revenue, tiers);
    return {
      revenue,
      percent,
      value: (revenue * percent) / 100,
    };
  }).filter((ex) => ex.percent > 0);
}

export function emptyClient() {
  return {
    legalName: '',
    tradeName: '',
    documentType: 'cnpj',
    document: '',
    email: '',
    phone: '',
    whatsapp: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    zip: '',
    legalRepName: '',
    legalRepRole: '',
    legalRepDocument: '',
    notes: '',
  };
}

export function formatClientAddress(client) {
  if (!client) return '';
  const line1 = [client.street, client.number].filter(Boolean).join(', ');
  const line2 = [client.complement, client.district].filter(Boolean).join(' - ');
  const line3 = [client.city, client.state].filter(Boolean).join('/');
  const line4 = client.zip ? `CEP ${client.zip}` : '';
  return [line1, line2, line3, line4].filter(Boolean).join(' · ');
}
