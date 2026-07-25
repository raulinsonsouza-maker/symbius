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
  getPublicProposal: (slug) =>
    request(`/public/proposals/${slug}`, { auth: false }),
  convertProposal: (id, data) =>
    request(`/proposals/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listClients: () => request('/clients'),
  getClient: (id) => request(`/clients/${id}`),
  createClient: (data) =>
    request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) =>
    request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  listContracts: () => request('/contracts'),
  getContract: (id) => request(`/contracts/${id}`),
  createContract: (data) =>
    request('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  updateContract: (id, data) =>
    request(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getPublicContract: (slug) =>
    request(`/public/contracts/${slug}`, { auth: false }),
};
