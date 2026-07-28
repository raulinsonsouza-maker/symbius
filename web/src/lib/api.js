const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'symbius-admin';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.auth === false ? {} : { 'X-Admin-Token': ADMIN_TOKEN }),
    ...options.headers,
  };
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getSettings: () => request('/settings'),
  updateSettings: (data) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  listServices: () => request('/services'),
  createService: (data) =>
    request('/services', { method: 'POST', body: JSON.stringify(data) }),
  patchService: (id, data) =>
    request(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  listProposals: () => request('/proposals'),
  getProposal: (id) => request(`/proposals/${id}`),
  createProposal: (data) =>
    request('/proposals', { method: 'POST', body: JSON.stringify(data) }),
  updateProposal: (id, data) =>
    request(`/proposals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveProposal: (id) =>
    request(`/proposals/${id}/archive`, { method: 'POST' }),
  getPublicProposal: (slug) =>
    request(`/public/proposals/${slug}`, { auth: false }),
  convertProposal: (id, data) =>
    request(`/proposals/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listComercial: () => request('/comercial'),
  listFunnelProjects: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ''),
    ).toString();
    return request(`/funnel-projects${q ? `?${q}` : ''}`);
  },
  getFunnelProject: (id) => request(`/funnel-projects/${id}`),
  createFunnelProject: (data) =>
    request('/funnel-projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateFunnelProject: (id, data) =>
    request(`/funnel-projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  duplicateFunnelProject: (id, data = {}) =>
    request(`/funnel-projects/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteFunnelProject: (id) =>
    request(`/funnel-projects/${id}`, { method: 'DELETE' }),
  listClients: () => request('/clients'),
  getClient: (id) => request(`/clients/${id}`),
  createClient: (data) =>
    request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) =>
    request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveClient: (id) =>
    request(`/clients/${id}/archive`, { method: 'POST' }),
  listContracts: () => request('/contracts'),
  getContract: (id) => request(`/contracts/${id}`),
  createContract: (data) =>
    request('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  updateContract: (id, data) =>
    request(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getPublicContract: (slug) =>
    request(`/public/contracts/${slug}`, { auth: false }),
  listFinanceCategories: () => request('/finance/categories'),
  createFinanceCategory: (data) =>
    request('/finance/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listFinanceEntries: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ''),
    ).toString();
    return request(`/finance/entries${q ? `?${q}` : ''}`);
  },
  createFinanceEntry: (data) =>
    request('/finance/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateFinanceEntry: (id, data) =>
    request(`/finance/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  syncContractFinance: (id) =>
    request(`/finance/contracts/${id}/sync`, { method: 'POST' }),
  sendContract: (id) =>
    request(`/contracts/${id}/send`, { method: 'POST' }),
  chargeContractAsaas: (id) =>
    request(`/contracts/${id}/asaas/charge`, { method: 'POST' }),
  chargeContractCommission: (id, data) =>
    request(`/contracts/${id}/asaas/commission`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getContractSignature: (id) => request(`/contracts/${id}/signature`),
  getPublicSign: (token) =>
    request(`/public/sign/${token}`, { auth: false }),
  postPublicSign: (token, data) =>
    request(`/public/sign/${token}`, {
      method: 'POST',
      body: JSON.stringify(data),
      auth: false,
    }),
  getCashflow: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ''),
    ).toString();
    return request(`/finance/cashflow${q ? `?${q}` : ''}`);
  },
  getAsaasFinanceOverview: () => request('/finance/asaas/overview'),
  listAsaasFinancePayments: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ''),
    ).toString();
    return request(`/finance/asaas/payments${q ? `?${q}` : ''}`);
  },
  syncAsaasFinance: (data = {}) =>
    request('/finance/asaas/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
