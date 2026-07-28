export const SOURCE_OPTIONS = [
  {
    value: 'email',
    label: 'E-mail',
    audienceLabel: 'E-mails entregues',
    rateLabel: 'Taxa de clique',
  },
  {
    value: 'event',
    label: 'Evento',
    audienceLabel: 'Participantes',
    rateLabel: 'Taxa de avanço',
  },
  {
    value: 'referral',
    label: 'Indicação',
    audienceLabel: 'Indicações recebidas',
    rateLabel: 'Taxa de acesso',
  },
  {
    value: 'organic',
    label: 'Orgânico',
    audienceLabel: 'Pessoas alcançadas',
    rateLabel: 'Taxa de acesso',
  },
  {
    value: 'partner',
    label: 'Parceria',
    audienceLabel: 'Público alcançado',
    rateLabel: 'Taxa de acesso',
  },
  {
    value: 'other',
    label: 'Outra fonte',
    audienceLabel: 'Base potencial',
    rateLabel: 'Taxa de acesso',
  },
];

export const DESTINATION_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'site', label: 'Site / landing' },
];

export function getDestinationOption(destinationType) {
  return (
    DESTINATION_OPTIONS.find((option) => option.value === destinationType) ||
    DESTINATION_OPTIONS[DESTINATION_OPTIONS.length - 1]
  );
}

export const NODE_META = {
  traffic: {
    label: 'Tráfego',
    description: 'Origem de visitantes',
    tone: 'traffic',
  },
  optin: {
    label: 'Captura',
    description: 'Geração de leads',
    tone: 'optin',
  },
  sales: {
    label: 'Página de vendas',
    description: 'Apresentação da oferta',
    tone: 'sales',
  },
  checkout: {
    label: 'Checkout',
    description: 'Oferta principal',
    tone: 'checkout',
  },
  upsell: {
    label: 'Upsell',
    description: 'Oferta adicional',
    tone: 'upsell',
  },
  downsell: {
    label: 'Downsell',
    description: 'Oferta alternativa',
    tone: 'downsell',
  },
  thankyou: {
    label: 'Obrigado',
    description: 'Encerramento do fluxo',
    tone: 'thankyou',
  },
  destination: {
    label: 'Destino',
    description: 'Para onde o tráfego vai',
    tone: 'destination',
  },
  note: {
    label: 'Texto',
    description: 'Título ou anotação no mapa',
    tone: 'note',
  },
};

export const DEFAULT_NODE_DATA = {
  traffic: {
    label: 'Meta Ads',
    kind: 'traffic',
    conversionRate: 100,
    visitors: 1000,
    monthlyBudget: 1500,
    acquisitionModel: 'cpc',
    sourceType: 'other',
    audienceSize: 1000,
    engagementRate: 10,
    cpc: 1.5,
    cpm: 22,
    ctr: 1.5,
    price: 0,
    productCost: 0,
    refundRate: 0,
  },
  optin: {
    label: 'Landing page',
    kind: 'optin',
    conversionRate: 35,
    visitors: 0,
    cpc: 0,
    price: 0,
    productCost: 0,
    refundRate: 0,
  },
  sales: {
    label: 'Página de vendas',
    kind: 'sales',
    conversionRate: 12,
    visitors: 0,
    cpc: 0,
    price: 0,
    productCost: 0,
    refundRate: 0,
  },
  checkout: {
    label: 'Oferta principal',
    kind: 'checkout',
    conversionRate: 48,
    visitors: 0,
    cpc: 0,
    price: 497,
    productCost: 35,
    refundRate: 5,
  },
  upsell: {
    label: 'Upsell estratégico',
    kind: 'upsell',
    conversionRate: 22,
    visitors: 0,
    cpc: 0,
    price: 197,
    productCost: 12,
    refundRate: 3,
  },
  downsell: {
    label: 'Oferta de entrada',
    kind: 'downsell',
    conversionRate: 18,
    visitors: 0,
    cpc: 0,
    price: 97,
    productCost: 5,
    refundRate: 3,
  },
  thankyou: {
    label: 'Página de obrigado',
    kind: 'thankyou',
    conversionRate: 100,
    visitors: 0,
    cpc: 0,
    price: 0,
    productCost: 0,
    refundRate: 0,
  },
  destination: {
    label: 'Destino',
    kind: 'destination',
    destinationType: 'site',
    conversionRate: 40,
    visitors: 0,
    cpc: 0,
    price: 0,
    productCost: 0,
    refundRate: 0,
  },
  note: {
    label: 'Título do funil',
    kind: 'note',
    noteText: '',
    conversionRate: 100,
    visitors: 0,
    cpc: 0,
    price: 0,
    productCost: 0,
    refundRate: 0,
  },
};
