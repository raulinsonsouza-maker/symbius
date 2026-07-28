const moneyNodeKinds = new Set(['checkout', 'upsell', 'downsell']);

const emptyResult = () => ({
  incoming: 0,
  converted: 0,
  rejected: 0,
  newLeads: 0,
  newCustomers: 0,
  transactions: 0,
  revenue: 0,
  trafficCost: 0,
  productCost: 0,
  refunds: 0,
});

const safePercent = (value) =>
  Math.min(100, Math.max(0, Number(value) || 0)) / 100;

const cohortKey = ({ sourceId, isLead, isCustomer }) =>
  `${sourceId}:${isLead ? 1 : 0}:${isCustomer ? 1 : 0}`;

function getTrafficForecast(node) {
  const model =
    node.data.acquisitionModel === 'source'
      ? 'source'
      : node.data.acquisitionModel === 'cpm'
        ? 'cpm'
        : 'cpc';
  const sourceType = [
    'email',
    'event',
    'referral',
    'organic',
    'partner',
    'other',
  ].includes(String(node.data.sourceType))
    ? node.data.sourceType
    : 'other';
  const fallbackVisitors = Math.max(0, Number(node.data.visitors) || 0);
  const cpc = Math.max(0, Number(node.data.cpc) || 0);
  const cpm = Math.max(0, Number(node.data.cpm) || 0);
  const ctr = safePercent(Number(node.data.ctr) || 0);
  const configuredBudget = Math.max(0, Number(node.data.monthlyBudget) || 0);

  if (model === 'source') {
    const audience = Math.max(
      0,
      Number(node.data.audienceSize) || fallbackVisitors,
    );
    const engagementRate = safePercent(Number(node.data.engagementRate) || 0);
    const visitors = audience * engagementRate;
    return { model, sourceType, budget: configuredBudget, impressions: audience, visitors };
  }

  if (model === 'cpm') {
    const fallbackBudget = ctr > 0 ? (fallbackVisitors / ctr / 1000) * cpm : 0;
    const budget = configuredBudget || fallbackBudget;
    const impressions = cpm > 0 ? (budget / cpm) * 1000 : 0;
    const visitors = impressions > 0 && ctr > 0 ? impressions * ctr : fallbackVisitors;
    return { model, sourceType, budget, impressions, visitors };
  }

  const budget = configuredBudget || fallbackVisitors * cpc;
  const visitors = budget > 0 && cpc > 0 ? budget / cpc : fallbackVisitors;
  return { model, sourceType, budget, impressions: visitors, visitors };
}

export function simulateFunnel(nodes, edges) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incomingCount = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map();

  edges.forEach((edge) => {
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
  });

  const queue = nodes
    .filter((node) => (incomingCount.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  const ordered = [];
  const counts = new Map(incomingCount);

  while (queue.length) {
    const id = queue.shift();
    ordered.push(id);
    for (const edge of outgoing.get(id) ?? []) {
      const next = (counts.get(edge.target) ?? 0) - 1;
      counts.set(edge.target, next);
      if (next === 0) queue.push(edge.target);
    }
  }

  const warnings = [];
  if (ordered.length !== nodes.length) {
    warnings.push(
      'Há um ciclo no mapa. A simulação considerou apenas o trecho anterior ao ciclo.',
    );
  }

  const resultByNode = Object.fromEntries(
    nodes.map((node) => [node.id, emptyResult()]),
  );
  const pendingInput = new Map();
  const campaignResults = {};
  const campaignProductCost = {};
  const campaignRefunds = {};

  for (const node of nodes.filter((item) => item.data.kind === 'traffic')) {
    const forecast = getTrafficForecast(node);
    campaignResults[node.id] = {
      id: node.id,
      label: node.data.label,
      acquisitionModel: forecast.model,
      sourceType: forecast.sourceType,
      budget: forecast.budget,
      impressions: forecast.impressions,
      visitors: forecast.visitors,
      leads: 0,
      buyers: 0,
      orders: 0,
      primaryOrders: 0,
      primaryDeclines: 0,
      upsellOrders: 0,
      downsellOrders: 0,
      downsellRecoveredBuyers: 0,
      upsellTakeRate: 0,
      downsellRecoveryRate: 0,
      revenue: 0,
      profit: -forecast.budget,
      conversionRate: 0,
      cac: 0,
      cpa: 0,
      aov: 0,
      roas: 0,
    };
    campaignProductCost[node.id] = 0;
    campaignRefunds[node.id] = 0;
  }

  const addPending = (target, slice, amount) => {
    if (amount <= 0) return;
    const cohort = pendingInput.get(target) ?? new Map();
    const nextSlice = { ...slice, amount };
    const key = cohortKey(nextSlice);
    const current = cohort.get(key);
    cohort.set(key, { ...nextSlice, amount: (current?.amount ?? 0) + amount });
    pendingInput.set(target, cohort);
  };

  for (const id of ordered) {
    const node = nodeById.get(id);
    if (!node) continue;

    const result = resultByNode[id];
    const trafficForecast =
      node.data.kind === 'traffic' ? getTrafficForecast(node) : null;
    const cohorts = trafficForecast
      ? new Map([
          [
            cohortKey({
              sourceId: node.id,
              isLead: false,
              isCustomer: false,
            }),
            {
              sourceId: node.id,
              isLead: false,
              isCustomer: false,
              amount: trafficForecast.visitors,
            },
          ],
        ])
      : (pendingInput.get(id) ?? new Map());
    const incoming = [...cohorts.values()].reduce(
      (sum, slice) => sum + slice.amount,
      0,
    );
    const rate = node.data.kind === 'traffic' ? 1 : safePercent(node.data.conversionRate);

    result.incoming = incoming;
    result.converted = incoming * rate;
    result.rejected = Math.max(0, incoming - result.converted);

    if (trafficForecast) {
      result.trafficCost = trafficForecast.budget;
    }

    if (moneyNodeKinds.has(node.data.kind)) {
      const gross = result.converted * Math.max(0, Number(node.data.price) || 0);
      result.transactions = result.converted;
      result.revenue = gross;
      result.productCost =
        result.converted * Math.max(0, Number(node.data.productCost) || 0);
      result.refunds = gross * safePercent(node.data.refundRate);
    }

    const convertedSlices = [];
    const rejectedSlices = [];

    for (const slice of cohorts.values()) {
      const sourceConverted = slice.amount * rate;
      const sourceRejected = Math.max(0, slice.amount - sourceConverted);
      const campaign = campaignResults[slice.sourceId];
      if (!campaign) continue;

      const convertedSlice = { ...slice, amount: sourceConverted };

      if (node.data.kind === 'optin') {
        if (!slice.isLead) {
          result.newLeads += sourceConverted;
          campaign.leads += sourceConverted;
        }
        convertedSlice.isLead = true;
      }

      if (moneyNodeKinds.has(node.data.kind)) {
        const sourceRevenue =
          sourceConverted * Math.max(0, Number(node.data.price) || 0);
        campaign.orders += sourceConverted;
        if (node.data.kind === 'checkout') {
          campaign.primaryOrders += sourceConverted;
          campaign.primaryDeclines += sourceRejected;
        }
        if (node.data.kind === 'upsell') campaign.upsellOrders += sourceConverted;
        if (node.data.kind === 'downsell') campaign.downsellOrders += sourceConverted;
        if (!slice.isCustomer) {
          result.newCustomers += sourceConverted;
          campaign.buyers += sourceConverted;
          if (node.data.kind === 'downsell') {
            campaign.downsellRecoveredBuyers += sourceConverted;
          }
        }
        convertedSlice.isCustomer = true;
        campaign.revenue += sourceRevenue;
        campaignProductCost[slice.sourceId] +=
          sourceConverted * Math.max(0, Number(node.data.productCost) || 0);
        campaignRefunds[slice.sourceId] +=
          sourceRevenue * safePercent(node.data.refundRate);
      }

      if (sourceConverted > 0) convertedSlices.push(convertedSlice);
      if (sourceRejected > 0) rejectedSlices.push({ ...slice, amount: sourceRejected });
    }

    const nodeEdges = outgoing.get(id) ?? [];
    const yesEdges = nodeEdges.filter(
      (edge) => (edge.data?.path ?? edge.sourceHandle) !== 'no',
    );
    const noEdges = nodeEdges.filter(
      (edge) => (edge.data?.path ?? edge.sourceHandle) === 'no',
    );

    for (const edge of yesEdges) {
      for (const slice of convertedSlices) {
        const share = yesEdges.length ? slice.amount / yesEdges.length : 0;
        addPending(edge.target, slice, share);
      }
    }
    for (const edge of noEdges) {
      for (const slice of rejectedSlices) {
        const share = noEdges.length ? slice.amount / noEdges.length : 0;
        addPending(edge.target, slice, share);
      }
    }
  }

  for (const campaign of Object.values(campaignResults)) {
    campaign.profit =
      campaign.revenue -
      campaign.budget -
      campaignProductCost[campaign.id] -
      campaignRefunds[campaign.id];
    campaign.conversionRate =
      campaign.visitors > 0 ? (campaign.buyers / campaign.visitors) * 100 : 0;
    campaign.cac = campaign.buyers > 0 ? campaign.budget / campaign.buyers : 0;
    campaign.cpa = campaign.orders > 0 ? campaign.budget / campaign.orders : 0;
    campaign.aov = campaign.buyers > 0 ? campaign.revenue / campaign.buyers : 0;
    campaign.upsellTakeRate =
      campaign.primaryOrders > 0
        ? (campaign.upsellOrders / campaign.primaryOrders) * 100
        : 0;
    campaign.downsellRecoveryRate =
      campaign.primaryDeclines > 0
        ? (campaign.downsellRecoveredBuyers / campaign.primaryDeclines) * 100
        : 0;
    campaign.roas = campaign.budget > 0 ? campaign.revenue / campaign.budget : 0;
  }

  const all = Object.values(resultByNode);
  const visitors = nodes
    .filter((node) => node.data.kind === 'traffic')
    .reduce((sum, node) => sum + resultByNode[node.id].incoming, 0);
  const leads = all.reduce((sum, result) => sum + result.newLeads, 0);
  const buyers = all.reduce((sum, result) => sum + result.newCustomers, 0);
  const orders = all.reduce((sum, result) => sum + result.transactions, 0);
  const primaryOrders = nodes
    .filter((node) => node.data.kind === 'checkout')
    .reduce((sum, node) => sum + resultByNode[node.id].transactions, 0);
  const primaryDeclines = nodes
    .filter((node) => node.data.kind === 'checkout')
    .reduce((sum, node) => sum + resultByNode[node.id].rejected, 0);
  const upsellOrders = nodes
    .filter((node) => node.data.kind === 'upsell')
    .reduce((sum, node) => sum + resultByNode[node.id].transactions, 0);
  const downsellOrders = nodes
    .filter((node) => node.data.kind === 'downsell')
    .reduce((sum, node) => sum + resultByNode[node.id].transactions, 0);
  const downsellRecoveredBuyers = nodes
    .filter((node) => node.data.kind === 'downsell')
    .reduce((sum, node) => sum + resultByNode[node.id].newCustomers, 0);
  const revenue = all.reduce((sum, result) => sum + result.revenue, 0);
  const trafficCost = all.reduce((sum, result) => sum + result.trafficCost, 0);
  const productCost = all.reduce((sum, result) => sum + result.productCost, 0);
  const refunds = all.reduce((sum, result) => sum + result.refunds, 0);
  const profit = revenue - trafficCost - productCost - refunds;

  return {
    visitors,
    leads,
    buyers,
    orders,
    primaryOrders,
    primaryDeclines,
    upsellOrders,
    downsellOrders,
    downsellRecoveredBuyers,
    upsellTakeRate: primaryOrders > 0 ? (upsellOrders / primaryOrders) * 100 : 0,
    downsellRecoveryRate:
      primaryDeclines > 0
        ? (downsellRecoveredBuyers / primaryDeclines) * 100
        : 0,
    revenue,
    trafficCost,
    productCost,
    refunds,
    profit,
    cac: buyers > 0 ? trafficCost / buyers : 0,
    cpa: orders > 0 ? trafficCost / orders : 0,
    aov: buyers > 0 ? revenue / buyers : 0,
    transactionAverage: orders > 0 ? revenue / orders : 0,
    roas: trafficCost > 0 ? revenue / trafficCost : 0,
    nodeResults: resultByNode,
    campaignResults,
    warnings,
  };
}
