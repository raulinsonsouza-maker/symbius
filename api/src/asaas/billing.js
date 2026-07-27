import {
  asaasConfigured,
  createCustomer,
  createPayment,
  createSubscription,
  listSubscriptionPayments,
  normalizeBillingType,
  onlyDigits,
  updateCustomer,
} from './client.js';
import {
  formatBRDate,
  parseBRDate,
  toISODate,
} from '../financeSync.js';

function clientName(client) {
  return (
    client?.legalName ||
    client?.tradeName ||
    client?.legalRepName ||
    'Cliente'
  );
}

function clientPhone(client) {
  return onlyDigits(client?.mobilePhone || client?.phone || client?.whatsapp);
}

export async function ensureAsaasCustomer(store, client) {
  if (!client?.id) throw new Error('Cliente obrigatório');
  if (!String(client.email || '').trim()) {
    throw new Error('Cliente sem e-mail — necessário para cobrança Asaas');
  }
  const cpfCnpj = onlyDigits(client.document);
  if (cpfCnpj.length < 11) {
    throw new Error('Cliente sem CPF/CNPJ válido — necessário para cobrança Asaas');
  }

  const payload = {
    name: clientName(client),
    email: String(client.email).trim(),
    cpfCnpj,
    mobilePhone: clientPhone(client) || undefined,
    externalReference: client.id,
    notificationDisabled: false,
  };

  if (client.asaasCustomerId) {
    try {
      const updated = await updateCustomer(client.asaasCustomerId, payload);
      return updated;
    } catch (err) {
      if (err.status !== 404) throw err;
    }
  }

  const created = await createCustomer(payload);
  await store.updateClient(client.id, { asaasCustomerId: created.id });
  return created;
}

function deriveFeePayDay(feeFirstDueDate, fallback = 5) {
  const d = parseBRDate(feeFirstDueDate);
  return d ? d.getDate() : fallback;
}

/**
 * Sync setup (one-off) + fee (subscription) to Asaas.
 * Updates contract and finance entries in store.
 */
export async function chargeContractSetupAndFee(store, contractId) {
  if (!asaasConfigured()) {
    throw new Error('Configure ASAAS_API_KEY no ambiente da API');
  }

  const contract = await store.getContract(contractId);
  if (!contract) throw new Error('Contrato não encontrado');
  if (!contract.clientId) throw new Error('Contrato sem cliente vinculado');

  const client = await store.getClient(contract.clientId);
  if (!client) throw new Error('Cliente não encontrado');

  const billingType = normalizeBillingType(contract.asaasBillingType);
  const customer = await ensureAsaasCustomer(store, client);

  // Ensure local schedule exists / is fresh
  if (store.syncContractFinance) {
    await store.syncContractFinance(contract.id);
  }

  const entries = await store.listFinanceEntries({ contractId: contract.id });
  const active = entries.filter((e) => e.status !== 'cancelled');

  const result = {
    customerId: customer.id,
    setupPayment: null,
    subscription: null,
    setupEntry: null,
    feeEntry: null,
  };

  const patchContract = {
    asaasBillingType: billingType,
    feePayDay: deriveFeePayDay(contract.feeFirstDueDate, contract.feePayDay ?? 5),
  };

  // Setup payment
  if (contract.setupEnabled && Number(contract.setupPrice) > 0) {
    let setupEntry = active.find(
      (e) => e.origin === 'contract_setup' && !['received', 'paid'].includes(e.status),
    );
    if (!setupEntry?.asaasPaymentId) {
      const dueIso =
        toISODate(parseBRDate(contract.setupDueDate || setupEntry?.dueDate)) ||
        toISODate(new Date());
      const payment = await createPayment({
        customer: customer.id,
        billingType,
        value: Number(contract.setupPrice),
        dueDate: dueIso,
        description: `${contract.setupTitle || 'Setup'} — ${contract.number || ''}`.trim(),
        externalReference: setupEntry?.id || `setup:${contract.id}`,
      });
      result.setupPayment = payment;
      patchContract.asaasSetupPaymentId = payment.id;
      if (setupEntry) {
        setupEntry = await store.updateFinanceEntry(setupEntry.id, {
          asaasPaymentId: payment.id,
          invoiceUrl: payment.invoiceUrl || '',
          billingType,
          dueDate: formatBRDate(parseBRDate(dueIso)),
        });
      }
      result.setupEntry = setupEntry;
    } else {
      result.setupEntry = setupEntry;
      patchContract.asaasSetupPaymentId =
        setupEntry.asaasPaymentId || contract.asaasSetupPaymentId;
    }
  }

  // Fee subscription
  if (contract.feeEnabled && Number(contract.feePrice) > 0) {
    if (contract.asaasSubscriptionId) {
      result.subscription = { id: contract.asaasSubscriptionId };
    } else {
      const nextDue =
        toISODate(parseBRDate(contract.feeFirstDueDate)) ||
        toISODate(new Date());
      const subscription = await createSubscription({
        customer: customer.id,
        billingType,
        value: Number(contract.feePrice),
        nextDueDate: nextDue,
        cycle: 'MONTHLY',
        description: `${contract.feeTitle || 'Fee mensal'} — ${contract.number || ''}`.trim(),
        externalReference: contract.id,
      });
      result.subscription = subscription;
      patchContract.asaasSubscriptionId = subscription.id;

      // Link first fee entry to first payment if available
      try {
        const list = await listSubscriptionPayments(subscription.id);
        const first = list?.data?.[0];
        if (first) {
          const feeEntry = active
            .filter((e) => e.origin === 'contract_fee' && !e.asaasPaymentId)
            .sort((a, b) =>
              toISODate(parseBRDate(a.dueDate)).localeCompare(
                toISODate(parseBRDate(b.dueDate)),
              ),
            )[0];
          if (feeEntry) {
            result.feeEntry = await store.updateFinanceEntry(feeEntry.id, {
              asaasPaymentId: first.id,
              invoiceUrl: first.invoiceUrl || '',
              billingType,
            });
          }
        }
      } catch (err) {
        console.warn('Listar cobranças da assinatura falhou:', err.message);
      }
    }
  }

  patchContract.asaasSyncedAt = new Date().toISOString();
  const updated = await store.updateContract(contract.id, patchContract);
  if (client.asaasCustomerId !== customer.id) {
    await store.updateClient(client.id, { asaasCustomerId: customer.id });
  }

  return { contract: updated, ...result };
}

/**
 * Create a manual commission payment (one-off).
 */
export async function chargeCommission(store, contractId, input) {
  if (!asaasConfigured()) {
    throw new Error('Configure ASAAS_API_KEY no ambiente da API');
  }

  const amount = Number(input.amount);
  if (!amount || amount <= 0) throw new Error('Informe o valor da comissão');
  const dueIso = toISODate(parseBRDate(input.dueDate));
  if (!dueIso) throw new Error('Informe a data de vencimento');

  const contract = await store.getContract(contractId);
  if (!contract) throw new Error('Contrato não encontrado');
  if (!contract.commissionEnabled) {
    throw new Error('Este contrato não possui comissão habilitada');
  }
  if (!contract.clientId) throw new Error('Contrato sem cliente vinculado');

  const client = await store.getClient(contract.clientId);
  if (!client) throw new Error('Cliente não encontrado');

  const billingType = normalizeBillingType(
    input.billingType || contract.asaasBillingType,
  );
  const customer = await ensureAsaasCustomer(store, client);

  const cats = await store.listFinanceCategories();
  const commissionCat =
    cats.find((c) => c.key === 'commission') ||
    cats.find((c) => /comiss/i.test(c.name));

  const entry = await store.createFinanceEntry({
    type: 'income',
    origin: 'contract_commission',
    status: 'scheduled',
    amount,
    dueDate: formatBRDate(parseBRDate(dueIso)),
    description: `Comissão — ${contract.number || ''}`.trim(),
    categoryId: commissionCat?.id || null,
    clientId: client.id,
    contractId: contract.id,
    proposalId: contract.proposalId || null,
    notes: input.notes || '',
    billingType,
  });

  const payment = await createPayment({
    customer: customer.id,
    billingType,
    value: amount,
    dueDate: dueIso,
    description:
      entry.description + (input.notes ? ` — ${input.notes}` : ''),
    externalReference: entry.id,
  });

  const updatedEntry = await store.updateFinanceEntry(entry.id, {
    asaasPaymentId: payment.id,
    invoiceUrl: payment.invoiceUrl || '',
    billingType,
  });

  return { entry: updatedEntry, payment, customerId: customer.id };
}

/**
 * Apply Asaas payment webhook payload to local finance entry.
 */
export async function applyAsaasPaymentEvent(store, event, payment) {
  if (!payment?.id) return null;

  let entry =
    (await store.getFinanceEntryByAsaasPaymentId?.(payment.id)) ||
    (payment.externalReference
      ? await store.getFinanceEntry?.(payment.externalReference)
      : null);

  // Fee charges from subscription may arrive without matching entry yet
  if (!entry && payment.subscription && payment.externalReference) {
    // externalReference on subscription payments might be contract id
  }

  if (!entry && payment.subscription) {
    const contracts = await store.listContracts();
    const contract = contracts.find(
      (c) => c.asaasSubscriptionId === payment.subscription,
    );
    if (contract) {
      const entries = await store.listFinanceEntries({
        contractId: contract.id,
      });
      const dueIso = payment.dueDate;
      entry = entries.find(
        (e) =>
          e.origin === 'contract_fee' &&
          !['cancelled', 'received', 'paid'].includes(e.status) &&
          (!e.asaasPaymentId || e.asaasPaymentId === payment.id) &&
          toISODate(parseBRDate(e.dueDate)) === dueIso,
      );
      if (!entry) {
        // Create entry for this subscription charge
        const cats = await store.listFinanceCategories();
        const feeCat =
          cats.find((c) => c.key === 'fee') ||
          cats.find((c) => /fee/i.test(c.name));
        entry = await store.createFinanceEntry({
          type: 'income',
          origin: 'contract_fee',
          status: 'scheduled',
          amount: Number(payment.value) || 0,
          dueDate: formatBRDate(parseBRDate(payment.dueDate)),
          description: `${contract.feeTitle || 'Fee mensal'} — ${contract.number || ''}`.trim(),
          categoryId: feeCat?.id || null,
          clientId: contract.clientId || null,
          contractId: contract.id,
          proposalId: contract.proposalId || null,
          asaasPaymentId: payment.id,
          invoiceUrl: payment.invoiceUrl || '',
          billingType: payment.billingType || '',
        });
      }
    }
  }

  if (!entry) return null;

  const patch = {
    asaasPaymentId: payment.id,
    invoiceUrl: payment.invoiceUrl || entry.invoiceUrl || '',
    billingType: payment.billingType || entry.billingType || '',
  };

  if (
    event === 'PAYMENT_RECEIVED' ||
    event === 'PAYMENT_CONFIRMED' ||
    payment.status === 'RECEIVED' ||
    payment.status === 'CONFIRMED' ||
    payment.status === 'RECEIVED_IN_CASH'
  ) {
    patch.status = 'received';
    patch.paidAt =
      payment.paymentDate ||
      payment.confirmedDate ||
      formatBRDate(new Date());
  } else if (event === 'PAYMENT_OVERDUE' || payment.status === 'OVERDUE') {
    if (!['received', 'paid', 'cancelled'].includes(entry.status)) {
      patch.status = 'overdue';
    }
  } else if (
    event === 'PAYMENT_DELETED' ||
    event === 'PAYMENT_REFUNDED' ||
    payment.deleted
  ) {
    if (!['received', 'paid'].includes(entry.status)) {
      patch.status = 'cancelled';
    }
  }

  return store.updateFinanceEntry(entry.id, patch);
}
