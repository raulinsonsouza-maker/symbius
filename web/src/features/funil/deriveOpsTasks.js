import {
  getCampaignObjective,
  getCreativeFormat,
  getCrmMode,
  getDestinationOption,
  getDestinationOutcome,
  SOURCE_OPTIONS,
} from './funnelTypes';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function nodeLabel(node) {
  return String(node?.data?.label || node?.id || 'Etapa').trim();
}

function sourceOption(sourceType) {
  return (
    SOURCE_OPTIONS.find((option) => option.value === sourceType) ||
    SOURCE_OPTIONS[SOURCE_OPTIONS.length - 1]
  );
}

function connectedLabels(nodesById, ids) {
  return ids
    .map((id) => nodesById.get(id))
    .filter(Boolean)
    .map((node) => nodeLabel(node));
}

function joinList(items) {
  const list = items.filter(Boolean);
  if (!list.length) return 'etapa conectada';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} e ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`;
}

function buildGraphIndex(nodes, edges) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const parents = new Map(nodes.map((node) => [node.id, []]));
  const children = new Map(nodes.map((node) => [node.id, []]));

  for (const edge of edges || []) {
    if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) continue;
    parents.get(edge.target).push(edge.source);
    children.get(edge.source).push(edge.target);
  }

  return { nodesById, parents, children };
}

function taskBase(node, category, title, description, priority = 'medium', meta = {}) {
  return {
    id: `gen:${node.data.kind}:${node.id}`,
    nodeId: node.id,
    category,
    title,
    description,
    status: 'todo',
    priority,
    manual: false,
    meta,
  };
}

function deriveTrafficTask(node, index, simulation) {
  const campaign = simulation?.campaignResults?.[node.id];
  const parents = connectedLabels(index.nodesById, index.parents.get(node.id) || []);
  const children = connectedLabels(index.nodesById, index.children.get(node.id) || []);
  const destinationText = joinList(children);
  const isSource = node.data.acquisitionModel === 'source';

  if (isSource) {
    const source = sourceOption(node.data.sourceType);
    const audience = Number(node.data.audienceSize) || 0;
    const rate = Number(node.data.engagementRate) || 0;
    return taskBase(
      node,
      'campanha',
      `Configurar entrada ${source.label}`,
      `Configurar a fonte "${nodeLabel(node)}" (${source.label}) com base de ${number.format(audience)} e taxa de ${number.format(rate)}%. ` +
        `O fluxo segue para: ${destinationText}.`,
      'medium',
      {
        sourceType: source.value,
        audienceSize: audience,
        engagementRate: rate,
        destinations: children,
      },
    );
  }

  const objective = getCampaignObjective(node.data.campaignObjective);
  const budget =
    Number(campaign?.budget) || Number(node.data.monthlyBudget) || 0;
  return taskBase(
    node,
    'campanha',
    `Campanha ${objective.label} — ${nodeLabel(node)}`,
    `Criar campanha de ${objective.label.toLowerCase()} no Meta (ou mídia paga equivalente) para "${nodeLabel(node)}" ` +
      `com verba de ${money.format(budget)}/mês. ` +
      `Objetivo: ${objective.description}. ` +
      `A campanha deve enviar tráfego para: ${destinationText}.` +
      (parents.length ? ` Origem auxiliar: ${joinList(parents)}.` : ''),
    'high',
    {
      campaignObjective: objective.value,
      budget,
      destinations: children,
    },
  );
}

function deriveLandingTask(node, index) {
  const parents = connectedLabels(index.nodesById, index.parents.get(node.id) || []);
  const children = connectedLabels(index.nodesById, index.children.get(node.id) || []);
  const kindLabel =
    node.data.kind === 'optin'
      ? 'landing de captura'
      : node.data.kind === 'sales'
        ? 'página de vendas'
        : 'página de obrigado';

  return taskBase(
    node,
    'landing',
    `Desenvolver ${kindLabel} “${nodeLabel(node)}”`,
    `Desenvolver a ${kindLabel} “${nodeLabel(node)}” que recebe tráfego de ${joinList(parents)}. ` +
      `Taxa estimada de conversão: ${number.format(Number(node.data.conversionRate) || 0)}%. ` +
      (children.length
        ? `Após a conversão, o fluxo segue para: ${joinList(children)}.`
        : 'Definir o próximo passo após a conversão.'),
    'high',
    {
      conversionRate: Number(node.data.conversionRate) || 0,
      sources: parents,
      destinations: children,
    },
  );
}

function deriveCreativesTask(node, index) {
  const format = getCreativeFormat(node.data.creativeFormat);
  const quantity = Math.max(1, Number(node.data.quantity) || 1);
  const aspects = String(node.data.formats || format.defaultAspects).trim();
  const brief = String(node.data.brief || '').trim();
  const parents = connectedLabels(index.nodesById, index.parents.get(node.id) || []);
  const children = connectedLabels(index.nodesById, index.children.get(node.id) || []);

  return taskBase(
    node,
    'criativo',
    `Produzir ${quantity} criativos ${format.label.toLowerCase()}${quantity > 1 ? 's' : ''}`,
    `Produzir ${quantity} criativo(s) ${format.label.toLowerCase()}(s) para o fluxo. ` +
      `Formatos: ${aspects || 'a definir'}. ` +
      (brief ? `Brief: ${brief}. ` : 'Brief: detalhar mensagem, oferta e CTA. ') +
      `Peças vinculadas a: ${joinList(parents.length ? parents : children)}.`,
    'high',
    {
      creativeFormat: format.value,
      quantity,
      formats: aspects,
      brief,
      sources: parents,
      destinations: children,
    },
  );
}

function deriveCrmTask(node, index) {
  const mode = getCrmMode(node.data.crmMode);
  const parents = connectedLabels(index.nodesById, index.parents.get(node.id) || []);
  const children = connectedLabels(index.nodesById, index.children.get(node.id) || []);
  return taskBase(
    node,
    'crm',
    `Operar CRM — ${mode.label}`,
    `Configurar o CRM em modo ${mode.label.toLowerCase()} (${mode.description}) para leads vindos de ${joinList(parents)}. ` +
      `Taxa de ${mode.rateLabel.toLowerCase()}: ${number.format(Number(node.data.conversionRate) || 0)}%. ` +
      `Leads avançados seguem para: ${joinList(children)}.`,
    'medium',
    {
      crmMode: mode.value,
      conversionRate: Number(node.data.conversionRate) || 0,
      sources: parents,
      destinations: children,
    },
  );
}

function deriveDestinationTask(node, index) {
  const destination = getDestinationOption(node.data.destinationType);
  const outcome = getDestinationOutcome(
    node.data.destinationType,
    node.data.destinationOutcome,
  );
  const parents = connectedLabels(index.nodesById, index.parents.get(node.id) || []);
  return taskBase(
    node,
    'destino',
    `Configurar destino ${destination.label}`,
    `Configurar o destino ${destination.label} (“${nodeLabel(node)}”) com resultado “${outcome.label}”. ` +
      `Recebe tráfego de ${joinList(parents)}. ` +
      `${outcome.rateLabel}: ${number.format(Number(node.data.conversionRate) || 0)}%.`,
    'medium',
    {
      destinationType: destination.value,
      destinationOutcome: outcome.value,
      conversionRate: Number(node.data.conversionRate) || 0,
      sources: parents,
    },
  );
}

function deriveOfferTask(node, index) {
  const parents = connectedLabels(index.nodesById, index.parents.get(node.id) || []);
  const children = connectedLabels(index.nodesById, index.children.get(node.id) || []);
  const kindLabel =
    node.data.kind === 'checkout'
      ? 'checkout / oferta principal'
      : node.data.kind === 'upsell'
        ? 'upsell'
        : 'downsell';
  const price = Number(node.data.price) || 0;
  return taskBase(
    node,
    'checkout',
    `Configurar ${kindLabel} “${nodeLabel(node)}”`,
    `Configurar ${kindLabel} “${nodeLabel(node)}” com preço de ${money.format(price)}. ` +
      `Taxa estimada: ${number.format(Number(node.data.conversionRate) || 0)}%. ` +
      `Chega de ${joinList(parents)}` +
      (children.length ? ` e segue para ${joinList(children)}.` : '.'),
    node.data.kind === 'checkout' ? 'high' : 'medium',
    {
      price,
      conversionRate: Number(node.data.conversionRate) || 0,
      sources: parents,
      destinations: children,
    },
  );
}

export function deriveOpsTasks(nodes = [], edges = [], simulation = null) {
  const index = buildGraphIndex(nodes, edges);
  const tasks = [];

  for (const node of nodes) {
    const kind = node?.data?.kind;
    if (!kind || kind === 'note') continue;

    if (kind === 'traffic') {
      tasks.push(deriveTrafficTask(node, index, simulation));
      continue;
    }
    if (kind === 'optin' || kind === 'sales' || kind === 'thankyou') {
      tasks.push(deriveLandingTask(node, index));
      continue;
    }
    if (kind === 'creatives') {
      tasks.push(deriveCreativesTask(node, index));
      continue;
    }
    if (kind === 'crm') {
      tasks.push(deriveCrmTask(node, index));
      continue;
    }
    if (kind === 'destination') {
      tasks.push(deriveDestinationTask(node, index));
      continue;
    }
    if (kind === 'checkout' || kind === 'upsell' || kind === 'downsell') {
      tasks.push(deriveOfferTask(node, index));
    }
  }

  return tasks;
}

export function mergeOpsTasks(existing = [], generated = []) {
  const previous = Array.isArray(existing) ? existing : [];
  const byId = new Map(previous.map((task) => [task.id, task]));
  const mergedGenerated = generated.map((task) => {
    const prev = byId.get(task.id);
    if (!prev) return task;
    return {
      ...task,
      status: prev.status || task.status,
      priority: prev.priority || task.priority,
    };
  });
  const manuals = previous.filter((task) => task.manual);
  return [...mergedGenerated, ...manuals];
}

export function createManualOpsTask(partial = {}) {
  const id = `manual:${crypto.randomUUID()}`;
  return {
    id,
    nodeId: null,
    category: partial.category || 'outro',
    title: partial.title || 'Nova tarefa de produção',
    description: partial.description || '',
    status: partial.status || 'todo',
    priority: partial.priority || 'medium',
    manual: true,
    meta: partial.meta || {},
  };
}

export function sanitizeOpsTasks(tasks = []) {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .map((task) => ({
      id: String(task.id || ''),
      nodeId: task.nodeId ? String(task.nodeId) : null,
      category: String(task.category || 'outro'),
      title: String(task.title || '').trim() || 'Tarefa',
      description: String(task.description || ''),
      status: ['todo', 'doing', 'done'].includes(task.status)
        ? task.status
        : 'todo',
      priority: ['high', 'medium', 'low'].includes(task.priority)
        ? task.priority
        : 'medium',
      manual: Boolean(task.manual),
      meta:
        task.meta && typeof task.meta === 'object' && !Array.isArray(task.meta)
          ? task.meta
          : {},
    }))
    .filter((task) => task.id);
}
