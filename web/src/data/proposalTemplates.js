export const DEFAULT_MANIFESTO =
  'O BrandGrowth não é uma lista de serviços. É um sistema onde Análise, Marca, Growth e Venda avançam juntos. Por isso não cobramos por peça — cobramos pelo sistema funcionando.';

export const DEFAULT_OBSERVATIONS = [
  'Escopo ajustável conforme diagnóstico e prioridades do cliente.',
  'Verba de mídia (tráfego) é à parte da gestão, quando aplicável.',
  'Prazos e entregáveis são definidos no kickoff.',
  'Alterações fora do escopo acordado geram valor adicional.',
];

export const DEFAULT_SCOPE = [
  'Diagnóstico',
  'Posicionamento',
  'Operação de Growth',
  'Acompanhamento',
];

export function createBlankDraft(settings = {}) {
  return {
    template: 'blank',
    clientName: '',
    responsibleName: settings.defaultResponsible || '',
    date: new Date().toLocaleDateString('pt-BR'),
    title: 'PROPOSTA COMERCIAL',
    subtitle: '',
    manifesto: '',
    scopeItems: [],
    setupEnabled: false,
    setupTitle: 'Setup',
    setupPrice: 0,
    setupFooter: '',
    setupServiceIds: [],
    operationEnabled: false,
    operationTitle: 'Operação BrandGrowth',
    operationPrice: 0,
    operationFooter: '',
    operationServiceIds: [],
    trafficEnabled: false,
    trafficPrice: 0,
    trafficFooter: 'Gestão de mídia (mídia à parte)',
    blankItems: [{ id: crypto.randomUUID(), description: '', totalValue: 0, unitDetail: 'Único', footerDetail: '' }],
    observations: [],
    status: 'draft',
  };
}

export function createBrandGrowthDraft(settings = {}, services = []) {
  const setupIds = services
    .filter((s) => s.block === 'setup' && s.active)
    .slice(0, 4)
    .map((s) => s.id);
  const opIds = services
    .filter((s) => s.block === 'operacao' && s.active)
    .slice(0, 4)
    .map((s) => s.id);

  return {
    template: 'brandgrowth',
    clientName: '',
    responsibleName: settings.defaultResponsible || '',
    date: new Date().toLocaleDateString('pt-BR'),
    title: 'PROPOSTA BRANDGROWTH',
    subtitle: 'SISTEMA DE ALTA CAPTAÇÃO DE CLIENTES',
    manifesto: DEFAULT_MANIFESTO,
    scopeItems: [...DEFAULT_SCOPE],
    setupEnabled: true,
    setupTitle: 'Setup',
    setupPrice: 0,
    setupFooter: 'Inclui diagnóstico, posicionamento e entregas iniciais de marca.',
    setupServiceIds: setupIds,
    operationEnabled: true,
    operationTitle: 'Operação BrandGrowth',
    operationPrice: 0,
    operationFooter: 'Gestão contínua de growth, canais e acompanhamento.',
    operationServiceIds: opIds,
    trafficEnabled: false,
    trafficPrice: 0,
    trafficFooter: 'Gestão de mídia (mídia à parte)',
    blankItems: [],
    observations: [...DEFAULT_OBSERVATIONS],
    status: 'draft',
  };
}

export function createSocialDraft(settings = {}, services = []) {
  const base = createBrandGrowthDraft(settings, services);
  return {
    ...base,
    template: 'social',
    title: 'PROPOSTA PRESENÇA DIGITAL',
    subtitle: 'OPERAÇÃO DE MÍDIAS E PRESENÇA',
    operationTitle: 'Operação de Presença Digital',
    operationFooter: 'Social media, conteúdo e acompanhamento contínuo.',
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);
}

export function resolveServiceNames(ids = [], services = []) {
  const map = new Map(services.map((s) => [s.id, s.name]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}
