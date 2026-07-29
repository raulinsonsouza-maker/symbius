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

/** Objetivos de campanha paga (Meta/Google-like). */
export const CAMPAIGN_OBJECTIVES = [
  {
    value: 'awareness',
    label: 'Reconhecimento',
    description: 'Alcance e impressões',
    suggestedModel: 'cpm',
  },
  {
    value: 'engagement',
    label: 'Engajamento',
    description: 'Curtidas, comentários e interações',
    suggestedModel: 'cpm',
  },
  {
    value: 'traffic',
    label: 'Tráfego',
    description: 'Cliques para o destino',
    suggestedModel: 'cpc',
  },
  {
    value: 'leads',
    label: 'Leads',
    description: 'Cadastros e formulários',
    suggestedModel: 'cpc',
  },
  {
    value: 'messages',
    label: 'Mensagens',
    description: 'Conversas iniciadas',
    suggestedModel: 'cpc',
  },
  {
    value: 'sales',
    label: 'Vendas',
    description: 'Compras e conversões',
    suggestedModel: 'cpc',
  },
];

export function getCampaignObjective(value) {
  return (
    CAMPAIGN_OBJECTIVES.find((option) => option.value === value) ||
    CAMPAIGN_OBJECTIVES.find((option) => option.value === 'traffic')
  );
}

export const DESTINATION_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'site', label: 'Site / landing' },
];

/** Resultados de conversão por destino. */
export const DESTINATION_OUTCOMES = {
  instagram: [
    {
      value: 'profile_visit',
      label: 'Visita ao perfil',
      rateLabel: 'Taxa de visita ao perfil',
      metricLabel: 'Visitas',
    },
    {
      value: 'followers',
      label: 'Seguidores',
      rateLabel: 'Taxa de seguidores',
      metricLabel: 'Seguidores',
    },
    {
      value: 'link_click',
      label: 'Clique no link',
      rateLabel: 'Taxa de clique no link',
      metricLabel: 'Cliques',
    },
    {
      value: 'dm',
      label: 'Mensagem (DM)',
      rateLabel: 'Taxa de mensagem',
      metricLabel: 'DMs',
    },
    {
      value: 'engagement',
      label: 'Engajamento',
      rateLabel: 'Taxa de engajamento',
      metricLabel: 'Interações',
    },
    {
      value: 'purchase',
      label: 'Compra',
      rateLabel: 'Taxa de compra',
      metricLabel: 'Compras',
    },
  ],
  tiktok: [
    {
      value: 'profile_visit',
      label: 'Visita ao perfil',
      rateLabel: 'Taxa de visita ao perfil',
      metricLabel: 'Visitas',
    },
    {
      value: 'followers',
      label: 'Seguidores',
      rateLabel: 'Taxa de seguidores',
      metricLabel: 'Seguidores',
    },
    {
      value: 'link_click',
      label: 'Clique no link',
      rateLabel: 'Taxa de clique no link',
      metricLabel: 'Cliques',
    },
    {
      value: 'video_view',
      label: 'Visualização',
      rateLabel: 'Taxa de visualização',
      metricLabel: 'Views',
    },
    {
      value: 'engagement',
      label: 'Engajamento',
      rateLabel: 'Taxa de engajamento',
      metricLabel: 'Interações',
    },
    {
      value: 'purchase',
      label: 'Compra',
      rateLabel: 'Taxa de compra',
      metricLabel: 'Compras',
    },
  ],
  youtube: [
    {
      value: 'views',
      label: 'Visualizações',
      rateLabel: 'Taxa de visualização',
      metricLabel: 'Views',
    },
    {
      value: 'subscribers',
      label: 'Inscritos',
      rateLabel: 'Taxa de inscritos',
      metricLabel: 'Inscritos',
    },
    {
      value: 'link_click',
      label: 'Clique no link',
      rateLabel: 'Taxa de clique no link',
      metricLabel: 'Cliques',
    },
    {
      value: 'engagement',
      label: 'Engajamento',
      rateLabel: 'Taxa de engajamento',
      metricLabel: 'Interações',
    },
  ],
  whatsapp: [
    {
      value: 'chat_start',
      label: 'Conversa iniciada',
      rateLabel: 'Taxa de conversa',
      metricLabel: 'Conversas',
    },
    {
      value: 'reply',
      label: 'Resposta',
      rateLabel: 'Taxa de resposta',
      metricLabel: 'Respostas',
    },
    {
      value: 'lead',
      label: 'Lead qualificado',
      rateLabel: 'Taxa de lead',
      metricLabel: 'Leads',
    },
  ],
  site: [
    {
      value: 'page_view',
      label: 'Visualização de página',
      rateLabel: 'Taxa de acesso',
      metricLabel: 'Acessos',
    },
    {
      value: 'lead',
      label: 'Lead / cadastro',
      rateLabel: 'Taxa de captura',
      metricLabel: 'Leads',
    },
    {
      value: 'click',
      label: 'Clique em CTA',
      rateLabel: 'Taxa de clique',
      metricLabel: 'Cliques',
    },
    {
      value: 'purchase',
      label: 'Compra',
      rateLabel: 'Taxa de compra',
      metricLabel: 'Compras',
    },
  ],
  ecommerce: [
    {
      value: 'product_view',
      label: 'Visita ao produto',
      rateLabel: 'Taxa de visita',
      metricLabel: 'Visitas',
    },
    {
      value: 'add_to_cart',
      label: 'Add to cart',
      rateLabel: 'Taxa de carrinho',
      metricLabel: 'Carrinhos',
    },
    {
      value: 'purchase',
      label: 'Compra',
      rateLabel: 'Taxa de compra',
      metricLabel: 'Compras',
    },
  ],
};

export const DEFAULT_DESTINATION_OUTCOME = {
  instagram: 'followers',
  tiktok: 'followers',
  youtube: 'subscribers',
  whatsapp: 'chat_start',
  site: 'page_view',
  ecommerce: 'purchase',
};

export function getDestinationOption(destinationType) {
  return (
    DESTINATION_OPTIONS.find((option) => option.value === destinationType) ||
    DESTINATION_OPTIONS[DESTINATION_OPTIONS.length - 1]
  );
}

export function getDestinationOutcomes(destinationType) {
  const key = DESTINATION_OUTCOMES[destinationType] ? destinationType : 'site';
  return DESTINATION_OUTCOMES[key];
}

export function getDestinationOutcome(destinationType, outcomeValue) {
  const type = DESTINATION_OUTCOMES[destinationType] ? destinationType : 'site';
  const outcomes = getDestinationOutcomes(type);
  return (
    outcomes.find((option) => option.value === outcomeValue) ||
    outcomes.find(
      (option) => option.value === DEFAULT_DESTINATION_OUTCOME[type],
    ) ||
    outcomes[0]
  );
}

export function isLeadDestinationOutcome(outcome) {
  return ['lead', 'dm', 'chat_start', 'reply', 'messages'].includes(
    String(outcome),
  );
}

export function isPurchaseDestinationOutcome(outcome) {
  return ['purchase'].includes(String(outcome));
}

/** Modos de operação do bloco CRM no funil. */
export const CRM_MODES = [
  {
    value: 'qualify',
    label: 'Qualificação',
    description: 'Triagem e lead score',
    rateLabel: 'Taxa de qualificação',
    metricLabel: 'Qualificados',
  },
  {
    value: 'nurture',
    label: 'Nutrição',
    description: 'Sequências e relacionamento',
    rateLabel: 'Taxa de avanço',
    metricLabel: 'Avanços',
  },
  {
    value: 'followup',
    label: 'Follow-up',
    description: 'Contato comercial ativo',
    rateLabel: 'Taxa de resposta',
    metricLabel: 'Respostas',
  },
];

export function getCrmMode(value) {
  return (
    CRM_MODES.find((option) => option.value === value) ||
    CRM_MODES.find((option) => option.value === 'qualify')
  );
}

/** Formatos de criativo no funil. */
export const CREATIVE_FORMATS = [
  {
    value: 'static',
    label: 'Estático',
    description: 'Imagens e carrosséis',
    defaultQuantity: 3,
    defaultAspects: '1:1, 4:5, 9:16',
  },
  {
    value: 'video',
    label: 'Vídeo',
    description: 'Reels, stories e anúncios em vídeo',
    defaultQuantity: 2,
    defaultAspects: '9:16, 1:1',
  },
];

export function getCreativeFormat(value) {
  return (
    CREATIVE_FORMATS.find((option) => option.value === value) ||
    CREATIVE_FORMATS.find((option) => option.value === 'static')
  );
}

export const OPS_TASK_STATUSES = [
  { value: 'todo', label: 'A fazer' },
  { value: 'doing', label: 'Em andamento' },
  { value: 'arte', label: 'Arte' },
  { value: 'revisao', label: 'Revisão' },
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'done', label: 'Concluído' },
];

export const OPS_TASK_PRIORITIES = [
  { value: 'urgent', label: 'Urgente', tone: 'urgent' },
  { value: 'high', label: 'Alta', tone: 'high' },
  { value: 'medium', label: 'Média', tone: 'medium' },
  { value: 'low', label: 'Baixa', tone: 'low' },
];

const OPS_STATUS_VALUES = new Set(OPS_TASK_STATUSES.map((s) => s.value));
const OPS_PRIORITY_VALUES = new Set(OPS_TASK_PRIORITIES.map((p) => p.value));

export function getOpsTaskStatus(value) {
  return (
    OPS_TASK_STATUSES.find((status) => status.value === value) ||
    OPS_TASK_STATUSES[0]
  );
}

export function getOpsTaskPriority(value) {
  const normalized = value === 'high' || value === 'urgent' || value === 'medium' || value === 'low'
    ? value
    : 'medium';
  return (
    OPS_TASK_PRIORITIES.find((priority) => priority.value === normalized) ||
    OPS_TASK_PRIORITIES[2]
  );
}

export function isOpsTaskStatus(value) {
  return OPS_STATUS_VALUES.has(String(value));
}

export function isOpsTaskPriority(value) {
  return OPS_PRIORITY_VALUES.has(String(value));
}

export function createOpsId(prefix = 'item') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createOpsActivity({ type, message, meta = {}, role = 'outro' }) {
  return {
    id: createOpsId('act'),
    type: String(type || 'update'),
    message: String(message || '').trim() || 'Atualização',
    at: new Date().toISOString(),
    role: String(role || 'outro'),
    meta:
      meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {},
  };
}

export function getOpsChecklistProgress(task) {
  const list = Array.isArray(task?.checklist) ? task.checklist : [];
  const done = list.filter((item) => item.done).length;
  return { done, total: list.length };
}

export function getOpsSubtaskProgress(task) {
  const list = Array.isArray(task?.subtasks) ? task.subtasks : [];
  const done = list.filter((item) => item.status === 'done').length;
  return { done, total: list.length };
}

export function getOpsTimerSessionMs(task) {
  if (!task?.timerStartedAt) return 0;
  const started = new Date(task.timerStartedAt).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Date.now() - started);
}

export function getOpsTimeLoggedMinutes(task) {
  const logs = Array.isArray(task?.timeLogs) ? task.timeLogs : [];
  const stored = logs.reduce((sum, log) => sum + (Number(log.minutes) || 0), 0);
  if (!task?.timerStartedAt) return stored;
  const running = Math.max(0, Math.floor(getOpsTimerSessionMs(task) / 60000));
  return stored + running;
}

export function getOpsTimeLoggedMs(task) {
  const logs = Array.isArray(task?.timeLogs) ? task.timeLogs : [];
  const storedMs = logs.reduce(
    (sum, log) => sum + (Number(log.minutes) || 0) * 60000,
    0,
  );
  return storedMs + getOpsTimerSessionMs(task);
}

export function formatOpsMinutes(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Formata milissegundos como HH:MM:SS. */
export function formatOpsClock(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms) / 1000) || 0);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const OPS_ROLES = [
  { value: 'designer', label: 'Designer' },
  { value: 'trafego', label: 'Gestor de tráfego' },
  { value: 'copy', label: 'Copy' },
  { value: 'dev', label: 'Desenvolvedor' },
  { value: 'crm', label: 'CRM' },
  { value: 'social', label: 'Social media' },
  { value: 'outro', label: 'Outro' },
];

const OPS_ROLE_VALUES = new Set(OPS_ROLES.map((role) => role.value));

export function getOpsRole(value) {
  return (
    OPS_ROLES.find((role) => role.value === value) ||
    OPS_ROLES[OPS_ROLES.length - 1]
  );
}

export function defaultRoleForTask(task = {}) {
  const category = String(task.category || '');
  const destinationType = String(task.meta?.destinationType || '');
  if (category === 'campanha') return 'trafego';
  if (category === 'criativo') return 'designer';
  if (category === 'crm') return 'crm';
  if (category === 'landing') return 'copy';
  if (category === 'checkout') return 'copy';
  if (category === 'destino') {
    if (
      destinationType === 'instagram' ||
      destinationType === 'tiktok' ||
      destinationType === 'youtube'
    ) {
      return 'social';
    }
    if (destinationType === 'whatsapp') return 'crm';
    if (destinationType === 'ecommerce' || destinationType === 'site') {
      return 'dev';
    }
    return 'outro';
  }
  return 'outro';
}

export function defaultDaysForTask(task = {}) {
  const category = String(task.category || '');
  const destinationType = String(task.meta?.destinationType || '');
  if (category === 'criativo') return 5;
  if (category === 'campanha') return 3;
  if (category === 'landing') return 5;
  if (category === 'checkout') return 4;
  if (category === 'crm') return 3;
  if (category === 'destino') {
    if (destinationType === 'ecommerce' || destinationType === 'site') return 5;
    return 3;
  }
  return 5;
}

export function isOpsRole(value) {
  return OPS_ROLE_VALUES.has(String(value));
}

export function addDaysToDate(baseDate, days) {
  const date = baseDate instanceof Date ? new Date(baseDate) : new Date();
  const safeDays = Math.min(90, Math.max(1, Number(days) || 1));
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + safeDays);
  return date.toISOString().slice(0, 10);
}

export function formatOpsDueDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export function isOpsDueOverdue(dueAt, status) {
  if (!dueAt || status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueAt}T12:00:00`);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export function sanitizeOpsDate(value) {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
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
  crm: {
    label: 'CRM',
    description: 'Qualificação e follow-up',
    tone: 'crm',
  },
  creatives: {
    label: 'Criativos',
    description: 'Peças estáticas ou vídeo',
    tone: 'creatives',
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
    campaignObjective: 'traffic',
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
  crm: {
    label: 'CRM / Qualificação',
    kind: 'crm',
    conversionRate: 40,
    crmMode: 'qualify',
    visitors: 0,
    cpc: 0,
    price: 0,
    productCost: 0,
    refundRate: 0,
  },
  creatives: {
    label: 'Criativos estáticos',
    kind: 'creatives',
    conversionRate: 100,
    creativeFormat: 'static',
    quantity: 3,
    formats: '1:1, 4:5, 9:16',
    brief: '',
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
    destinationOutcome: 'page_view',
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
    noteFill: 'none',
    noteStroke: 'none',
    conversionRate: 100,
    visitors: 0,
    cpc: 0,
    price: 0,
    productCost: 0,
    refundRate: 0,
  },
};

export const NOTE_FILL_PRESETS = [
  { value: 'none', label: 'Transparente' },
  { value: '#1a1a1a', label: 'Escuro' },
  { value: '#2a2418', label: 'Âmbar' },
  { value: '#142033', label: 'Azul' },
  { value: '#14261c', label: 'Verde' },
  { value: '#2a1818', label: 'Vermelho' },
];

export const NOTE_STROKE_PRESETS = [
  { value: 'none', label: 'Transparente' },
  { value: '#4e8cff', label: 'Azul' },
  { value: '#c4a574', label: 'Dourado' },
  { value: '#7de0d4', label: 'Turquesa' },
  { value: '#8fd6a6', label: 'Verde' },
  { value: '#ffffff', label: 'Branco' },
];
