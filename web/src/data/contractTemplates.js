import { formatCurrency, resolveServiceNames } from './proposalTemplates';

export const DEFAULT_OBJECTIVE =
  'O objetivo desta parceria é estruturar, otimizar e escalar os resultados de marketing e crescimento do contratante por meio da metodologia BrandGrowth da Symbius — unindo análise, marca, performance e acompanhamento contínuo da operação digital. O trabalho será orientado por otimização contínua, testes, melhoria de campanhas, análise de resultados e tomada de decisão baseada em dados.';

export const DEFAULT_SCOPE = [
  'Planejamento estratégico de marca, mídia e crescimento conforme o escopo contratado',
  'Gestão, criação, otimização e acompanhamento de campanhas e canais digitais relevantes para o projeto',
  'Estruturação e acompanhamento de ações de prospecção, remarketing e escalonamento, quando aplicável',
  'Monitoramento contínuo de performance e análise de oportunidades de otimização',
  'Reuniões de alinhamento estratégico no intervalo definido neste contrato',
  'Recomendações estratégicas para melhoria da performance comercial digital',
];

export const DEFAULT_PROVIDER_RESPONSIBILITIES = [
  'Planejamento, gestão e otimização das entregas e campanhas nos canais digitais relevantes para o projeto, conforme escopo contratado',
  'Monitoramento contínuo da performance das ações e canais sob gestão da Symbius',
  'Análise de dados e recomendações estratégicas para crescimento',
  'Realização de reuniões de alinhamento no intervalo definido neste contrato para acompanhamento dos resultados e definição de próximos passos',
  'Comunicação clara sobre progresso, riscos e oportunidades identificadas ao longo da operação',
];

export const DEFAULT_CLIENT_RESPONSIBILITIES = [
  'Disponibilizar acesso às plataformas, contas, materiais e informações necessárias para a execução do trabalho e acompanhamento dos resultados',
  'Investir na verba de mídia acordada, quando aplicável, paga diretamente às plataformas utilizadas',
  'Gerenciar toda a operação comercial, incluindo atendimento, pedidos, entregas, estoque, preços, promoções e pós-venda',
  'Garantir o funcionamento adequado do site, produto, estoque, preços, promoções e condições comerciais',
  'Participar das reuniões de alinhamento e colaborar com as decisões estratégicas do projeto',
  'Fornecer feedback e aprovações em tempo hábil para não comprometer prazos e resultados',
];

export const DEFAULT_OUT_OF_SCOPE = [
  'Atendimento comercial ou fechamento de vendas',
  'Gestão de pedidos, logística, entrega ou pós-venda',
  'Operação do negócio do contratante, incluindo estoque, preços, promoções ou condições comerciais',
  'Produção operacional de fotos, vídeos ou materiais criativos fora do que estiver explicitamente incluído no escopo',
  'Garantia de faturamento mínimo, ROI mínimo ou resultado comercial específico',
];

export const DEFAULT_MEETING_TOPICS = [
  'Revisão dos indicadores de performance',
  'Discussão de oportunidades de crescimento',
  'Ajustes de estratégia',
  'Revisão de resultados e próximos passos',
];

export const DEFAULT_IMPORTANT_NOTES = [
  'O desempenho do projeto depende diretamente da combinação entre qualidade da operação comercial do contratante, disponibilidade de estoque, experiência de compra do cliente, investimento em mídia e execução estratégica das ações.',
  'A Symbius atua na estruturação de marca, geração de demanda qualificada, gestão de campanhas e otimização de resultados — não havendo garantia de faturamento mínimo, volume de leads, ROI ou qualquer resultado comercial específico.',
  'A Symbius não se responsabiliza por decisões comerciais, operacionais ou financeiras tomadas exclusivamente pelo contratante, nem por falhas em plataformas de terceiros, indisponibilidade de estoque, problemas no site ou qualidade do atendimento comercial.',
  'Alterações relevantes de escopo, canais, prazos ou entregáveis fora do acordado neste contrato poderão gerar revisão de investimento e cronograma.',
  'A verba de mídia, quando houver, não está incluída na remuneração da gestão e é de responsabilidade integral do contratante.',
];

export const DEFAULT_COMMISSION_TIERS = [
  { from: 0, to: 30000, percent: 10 },
  { from: 30000, to: 60000, percent: 8 },
  { from: 60000, to: 100000, percent: 6 },
  { from: 100000, to: null, percent: 5 },
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

  const setupEnabled = Boolean(proposal?.setupEnabled && proposal?.setupPrice);
  const feeEnabled = Boolean(
    proposal?.operationEnabled && proposal?.operationPrice,
  );
  const mediaEnabled = Boolean(proposal?.trafficEnabled);

  const company = settings?.legalName || settings?.companyName || 'Symbius';
  const clientLabel = proposal?.clientName || 'o contratante';

  return {
    title:
      proposal?.title ||
      'Proposta comercial e contrato de prestação de serviços',
    subtitle: proposal?.subtitle || 'Parceria BrandGrowth',
    startDate: todayBR(),
    minTermDays: 90,
    meetingCadenceDays: 15,
    objective: DEFAULT_OBJECTIVE.replace(
      'do contratante',
      `de ${clientLabel}`,
    ),
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
    commissionBaseLabel: 'faturamento bruto mensal',
    commissionTiers: [...DEFAULT_COMMISSION_TIERS],
    commissionCloseDay: 5,
    commissionPayDay: 6,
    commissionExamples: [],

    mediaEnabled,
    mediaMonthlyBudget: Number(proposal?.trafficPrice) || 0,
    mediaNotes: `O investimento previsto para mídia será pago diretamente por ${clientLabel} às plataformas utilizadas. Este valor poderá ser ajustado futuramente conforme resultados, maturidade do projeto e oportunidade de escala. O valor de mídia não está incluído na remuneração da ${company} e é de responsabilidade integral do contratante.`,

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
