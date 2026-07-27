import {
  asaasConfigured,
  getBalance,
  listPayments,
} from './client.js';
import { applyAsaasPaymentEvent } from './billing.js';
import { toISODate } from '../financeSync.js';

function emptyBucket() {
  return { count: 0, value: 0 };
}

function addToBucket(bucket, payment) {
  bucket.count += 1;
  bucket.value += Number(payment.value) || 0;
}

async function fetchAllByStatus(status, extra = {}) {
  const limit = 100;
  let offset = 0;
  const items = [];
  // Cap pages to avoid long hangs
  for (let page = 0; page < 5; page += 1) {
    const res = await listPayments({
      status,
      limit,
      offset,
      ...extra,
    });
    const batch = res?.data || [];
    items.push(...batch);
    if (!res?.hasMore || batch.length === 0) break;
    offset += limit;
  }
  return items;
}

/**
 * Live Asaas overview for the finance dashboard.
 */
export async function buildAsaasOverview(store) {
  if (!asaasConfigured()) {
    return {
      configured: false,
      balance: 0,
      pending: emptyBucket(),
      overdue: emptyBucket(),
      confirmed: emptyBucket(),
      receivedMonth: emptyBucket(),
      recent: [],
      insights: {
        mrr: 0,
        unchargedCount: 0,
        unchargedValue: 0,
        scheduledMonth: 0,
      },
    };
  }

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthEnd = toISODate(monthEndDate);

  const [balanceRes, pending, overdue, confirmed, receivedMonth] =
    await Promise.all([
      getBalance(),
      fetchAllByStatus('PENDING'),
      fetchAllByStatus('OVERDUE'),
      fetchAllByStatus('CONFIRMED'),
      fetchAllByStatus('RECEIVED', {
        'paymentDate[ge]': monthStart,
        'paymentDate[le]': monthEnd,
      }),
    ]);

  const pendingBucket = emptyBucket();
  const overdueBucket = emptyBucket();
  const confirmedBucket = emptyBucket();
  const receivedBucket = emptyBucket();

  for (const p of pending) addToBucket(pendingBucket, p);
  for (const p of overdue) addToBucket(overdueBucket, p);
  for (const p of confirmed) addToBucket(confirmedBucket, p);
  for (const p of receivedMonth) addToBucket(receivedBucket, p);

  const recentPool = [...pending, ...overdue, ...confirmed, ...receivedMonth]
    .sort((a, b) => String(b.dueDate || '').localeCompare(String(a.dueDate || '')))
    .slice(0, 12);

  // Local insights
  const contracts = await store.listContracts();
  const mrr = contracts
    .filter(
      (c) =>
        c.feeEnabled &&
        Number(c.feePrice) > 0 &&
        c.asaasSubscriptionId &&
        ['active', 'signed'].includes(c.status),
    )
    .reduce((s, c) => s + (Number(c.feePrice) || 0), 0);

  const entries = await store.listFinanceEntries({});
  const month = monthStart.slice(0, 7);
  const todayIso = toISODate(now);
  const unchargedHorizon = new Date(now);
  unchargedHorizon.setDate(unchargedHorizon.getDate() + 30);
  const unchargedHorizonIso = toISODate(unchargedHorizon);

  let unchargedCount = 0;
  let unchargedValue = 0;
  let scheduledMonth = 0;
  for (const e of entries) {
    if (e.type !== 'income' || e.status === 'cancelled') continue;
    const dueIso = toISODate(e.dueDate) || '';
    // Só o que é acionável: atrasados ou vencendo em até 30 dias, sem cobrança Asaas
    if (['scheduled', 'overdue'].includes(e.status) && !e.asaasPaymentId) {
      const inWindow =
        e.status === 'overdue' ||
        (dueIso && dueIso >= todayIso && dueIso <= unchargedHorizonIso) ||
        (dueIso && dueIso < todayIso);
      if (inWindow) {
        unchargedCount += 1;
        unchargedValue += Number(e.amount) || 0;
      }
    }
    if (
      ['scheduled', 'overdue', 'received'].includes(e.status) &&
      dueIso.startsWith(month)
    ) {
      scheduledMonth += Number(e.amount) || 0;
    }
  }

  // Mark reconciled recent payments
  const recent = [];
  for (const p of recentPool) {
    const entry = await store.getFinanceEntryByAsaasPaymentId?.(p.id);
    recent.push({
      id: p.id,
      customer: p.customer,
      description: p.description || '',
      value: Number(p.value) || 0,
      netValue: Number(p.netValue) || 0,
      status: p.status,
      billingType: p.billingType,
      dueDate: p.dueDate,
      paymentDate: p.paymentDate || p.confirmedDate || null,
      invoiceUrl: p.invoiceUrl || '',
      subscription: p.subscription || null,
      externalReference: p.externalReference || null,
      reconciled: Boolean(entry),
      entryId: entry?.id || null,
    });
  }

  return {
    configured: true,
    balance: Number(balanceRes?.balance) || 0,
    pending: pendingBucket,
    overdue: overdueBucket,
    confirmed: confirmedBucket,
    receivedMonth: receivedBucket,
    toReceive: {
      count: pendingBucket.count + confirmedBucket.count,
      value: pendingBucket.value + confirmedBucket.value,
    },
    recent,
    insights: {
      mrr,
      unchargedCount,
      unchargedValue,
      scheduledMonth,
      receivedVsScheduled: {
        received: receivedBucket.value,
        scheduled: scheduledMonth,
      },
    },
  };
}

export async function listAsaasPaymentsForUi(store, query = {}) {
  if (!asaasConfigured()) {
    return { configured: false, data: [], totalCount: 0, hasMore: false };
  }
  const status = query.status && query.status !== 'ALL' ? query.status : undefined;
  const res = await listPayments({
    status,
    limit: Number(query.limit) || 50,
    offset: Number(query.offset) || 0,
  });
  const data = [];
  for (const p of res?.data || []) {
    const entry = await store.getFinanceEntryByAsaasPaymentId?.(p.id);
    data.push({
      id: p.id,
      customer: p.customer,
      description: p.description || '',
      value: Number(p.value) || 0,
      status: p.status,
      billingType: p.billingType,
      dueDate: p.dueDate,
      paymentDate: p.paymentDate || p.confirmedDate || null,
      invoiceUrl: p.invoiceUrl || '',
      subscription: p.subscription || null,
      reconciled: Boolean(entry),
      entryId: entry?.id || null,
    });
  }
  return {
    configured: true,
    data,
    totalCount: res?.totalCount ?? data.length,
    hasMore: Boolean(res?.hasMore),
  };
}

/**
 * Pull recent Asaas payments and reconcile into finance_entries.
 */
export async function syncAsaasPayments(store, { days = 90 } = {}) {
  if (!asaasConfigured()) {
    throw new Error('ASAAS_API_KEY não configurada');
  }
  const from = new Date();
  from.setDate(from.getDate() - Number(days) || 90);
  const dueDateGe = toISODate(from);

  const statuses = ['PENDING', 'OVERDUE', 'CONFIRMED', 'RECEIVED', 'REFUNDED'];
  let updated = 0;
  let created = 0;
  const errors = [];

  for (const status of statuses) {
    let offset = 0;
    const limit = 100;
    for (let page = 0; page < 8; page += 1) {
      let res;
      try {
        res = await listPayments({
          status,
          limit,
          offset,
          'dueDate[ge]': dueDateGe,
        });
      } catch (err) {
        errors.push(`${status}: ${err.message}`);
        break;
      }
      const batch = res?.data || [];
      for (const payment of batch) {
        const before = await store.getFinanceEntryByAsaasPaymentId?.(payment.id);
        try {
          const event =
            payment.status === 'OVERDUE'
              ? 'PAYMENT_OVERDUE'
              : payment.status === 'RECEIVED' ||
                  payment.status === 'RECEIVED_IN_CASH'
                ? 'PAYMENT_RECEIVED'
                : payment.status === 'CONFIRMED'
                  ? 'PAYMENT_CONFIRMED'
                  : payment.status === 'REFUNDED' || payment.deleted
                    ? 'PAYMENT_DELETED'
                    : 'PAYMENT_CREATED';
          const entry = await applyAsaasPaymentEvent(store, event, payment);
          if (entry) {
            if (before) updated += 1;
            else created += 1;
          }
        } catch (err) {
          errors.push(`${payment.id}: ${err.message}`);
        }
      }
      if (!res?.hasMore || batch.length === 0) break;
      offset += limit;
    }
  }

  return { updated, created, errors: errors.slice(0, 20) };
}
