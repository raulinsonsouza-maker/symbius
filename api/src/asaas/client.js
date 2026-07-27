const ASAAS_BILLING_TYPES = [
  'PIX',
  'BOLETO',
  'CREDIT_CARD',
  'UNDEFINED',
];

export function normalizeBillingType(value) {
  const v = String(value || 'UNDEFINED').toUpperCase();
  return ASAAS_BILLING_TYPES.includes(v) ? v : 'UNDEFINED';
}

export function asaasConfigured() {
  return Boolean(String(process.env.ASAAS_API_KEY || '').trim());
}

function baseUrl() {
  const env = String(process.env.ASAAS_ENV || 'sandbox').toLowerCase();
  if (env === 'production' || env === 'prod') {
    return 'https://api.asaas.com/v3';
  }
  return 'https://api-sandbox.asaas.com/v3';
}

export class AsaasError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'AsaasError';
    this.status = status;
    this.body = body;
  }
}

async function asaasRequest(method, path, body) {
  if (!asaasConfigured()) {
    throw new AsaasError('ASAAS_API_KEY não configurada', 503, null);
  }
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      access_token: process.env.ASAAS_API_KEY.trim(),
      'User-Agent': 'Symbius',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const desc =
      data?.errors?.[0]?.description ||
      data?.message ||
      `Asaas HTTP ${res.status}`;
    throw new AsaasError(desc, res.status, data);
  }
  return data;
}

export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export async function createCustomer(payload) {
  return asaasRequest('POST', '/customers', payload);
}

export async function updateCustomer(id, payload) {
  return asaasRequest('PUT', `/customers/${id}`, payload);
}

export async function getCustomer(id) {
  return asaasRequest('GET', `/customers/${id}`);
}

export async function createPayment(payload) {
  return asaasRequest('POST', '/payments', payload);
}

export async function createSubscription(payload) {
  return asaasRequest('POST', '/subscriptions', payload);
}

export async function listSubscriptionPayments(subscriptionId) {
  return asaasRequest('GET', `/subscriptions/${subscriptionId}/payments`);
}

export async function getPayment(id) {
  return asaasRequest('GET', `/payments/${id}`);
}

export async function getBalance() {
  return asaasRequest('GET', '/finance/balance');
}

export async function listPayments(params = {}) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') q.set(key, String(value));
  }
  const qs = q.toString();
  return asaasRequest('GET', `/payments${qs ? `?${qs}` : ''}`);
}

export { ASAAS_BILLING_TYPES };
