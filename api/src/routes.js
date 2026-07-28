import { getStore } from './store.js';
import {
  createSigningToken,
  signingExpiresAt,
  hashContractContent,
  isSigningTokenExpired,
  clientIp,
  publicSignatureView,
  stripSigningSecrets,
} from './signing.js';
import {
  emailConfigured,
  appBaseUrl,
  buildReadyToSignEmail,
  buildSignedEmail,
  buildInternalContractCreatedEmail,
  buildInternalContractSignedEmail,
  internalContractNotifyRecipients,
  sendEmail,
} from './email/resend.js';
import {
  generateSignedContractPdf,
  regenerateSignedContractPdf,
  resolveSignedPdfAbsolute,
} from './pdf/signedPdf.js';
import {
  applyAsaasPaymentEvent,
  chargeCommission,
  chargeContractSetupAndFee,
} from './asaas/billing.js';
import {
  buildAsaasOverview,
  listAsaasPaymentsForUi,
  syncAsaasPayments,
} from './asaas/financeOverview.js';

function defaultFunnelGraph() {
  return {
    nodes: [
      {
        id: 'traffic-1',
        type: 'funnel',
        position: { x: 40, y: 170 },
        data: {
          label: 'Meta Ads',
          kind: 'traffic',
          conversionRate: 100,
          visitors: 3500,
          monthlyBudget: 4725,
          acquisitionModel: 'cpc',
          sourceType: 'other',
          cpc: 1.35,
          cpm: 22,
          ctr: 1.5,
          price: 0,
          productCost: 0,
          refundRate: 0,
        },
      },
      {
        id: 'optin-1',
        type: 'funnel',
        position: { x: 310, y: 170 },
        data: {
          label: 'Captura',
          kind: 'optin',
          conversionRate: 38,
          visitors: 0,
          cpc: 0,
          price: 0,
          productCost: 0,
          refundRate: 0,
        },
      },
      {
        id: 'sales-1',
        type: 'funnel',
        position: { x: 580, y: 170 },
        data: {
          label: 'Página de vendas',
          kind: 'sales',
          conversionRate: 16,
          visitors: 0,
          cpc: 0,
          price: 0,
          productCost: 0,
          refundRate: 0,
        },
      },
      {
        id: 'checkout-1',
        type: 'funnel',
        position: { x: 850, y: 170 },
        data: {
          label: 'Checkout',
          kind: 'checkout',
          conversionRate: 52,
          visitors: 0,
          cpc: 0,
          price: 497,
          productCost: 42,
          refundRate: 5,
        },
      },
      {
        id: 'upsell-1',
        type: 'funnel',
        position: { x: 1120, y: 70 },
        data: {
          label: 'Upsell',
          kind: 'upsell',
          conversionRate: 24,
          visitors: 0,
          cpc: 0,
          price: 197,
          productCost: 12,
          refundRate: 3,
        },
      },
      {
        id: 'downsell-1',
        type: 'funnel',
        position: { x: 1120, y: 330 },
        data: {
          label: 'Downsell',
          kind: 'downsell',
          conversionRate: 19,
          visitors: 0,
          cpc: 0,
          price: 97,
          productCost: 5,
          refundRate: 3,
        },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'traffic-1',
        sourceHandle: 'yes',
        target: 'optin-1',
        type: 'deletable',
        data: { path: 'yes' },
      },
      {
        id: 'edge-2',
        source: 'optin-1',
        sourceHandle: 'yes',
        target: 'sales-1',
        type: 'deletable',
        data: { path: 'yes' },
      },
      {
        id: 'edge-3',
        source: 'sales-1',
        sourceHandle: 'yes',
        target: 'checkout-1',
        type: 'deletable',
        data: { path: 'yes' },
      },
      {
        id: 'edge-4',
        source: 'checkout-1',
        sourceHandle: 'yes',
        target: 'upsell-1',
        type: 'deletable',
        data: { path: 'yes' },
      },
      {
        id: 'edge-5',
        source: 'checkout-1',
        sourceHandle: 'no',
        target: 'downsell-1',
        type: 'deletable',
        data: { path: 'no' },
      },
    ],
  };
}

export async function getSettings(_req, res) {
  const settings = await getStore().getSettings();
  if (!settings) return res.status(404).json({ error: 'Settings não encontradas' });
  return res.json(settings);
}

export async function updateSettings(req, res) {
  const settings = await getStore().updateSettings(req.body || {});
  return res.json(settings);
}

export async function listServices(_req, res) {
  return res.json(await getStore().listServices());
}

export async function createService(req, res) {
  const { name, block } = req.body || {};
  if (!name || !['setup', 'operacao'].includes(block)) {
    return res.status(400).json({ error: 'name e block (setup|operacao) obrigatórios' });
  }
  const service = await getStore().createService({ name, block });
  return res.status(201).json(service);
}

export async function patchService(req, res) {
  const service = await getStore().patchService(req.params.id, req.body || {});
  if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
  return res.json(service);
}

export async function listProposals(_req, res) {
  return res.json(await getStore().listProposals());
}

export async function getProposal(req, res) {
  const proposal = await getStore().getProposal(req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });
  return res.json(proposal);
}

export async function createProposal(req, res) {
  const proposal = await getStore().createProposal(req.body || {});
  return res.status(201).json(proposal);
}

export async function updateProposal(req, res) {
  const store = getStore();
  const proposal = await store.updateProposal(req.params.id, req.body || {});
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });

  const pipeline = req.body?.pipelineStatus;
  if (pipeline && store.applyPipelineToContract) {
    await store.applyPipelineToContract(proposal.id, pipeline);
  }

  return res.json(proposal);
}

export async function getPublicProposal(req, res) {
  const store = getStore();
  const proposal = await store.getProposalBySlug(req.params.slug);
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });
  const settings = await store.getSettings();
  const services = (await store.listServices()).filter((s) => s.active);
  return res.json({ proposal, settings, services });
}

export async function listClients(_req, res) {
  return res.json(await getStore().listClients());
}

export async function getClient(req, res) {
  const client = await getStore().getClient(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  return res.json(client);
}

export async function archiveClient(req, res) {
  const client = await getStore().archiveClient(req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }
  return res.json(client);
}

export async function archiveProposal(req, res) {
  try {
    const proposal = await getStore().archiveProposal(req.params.id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }
    return res.json(proposal);
  } catch (err) {
    const status = err.status && err.status < 500 ? err.status : 400;
    return res.status(status).json({ error: err.message });
  }
}

export async function createClient(req, res) {
  const client = await getStore().createClient(req.body || {});
  return res.status(201).json(client);
}

export async function updateClient(req, res) {
  const client = await getStore().updateClient(req.params.id, req.body || {});
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  return res.json(client);
}

export async function listContracts(_req, res) {
  return res.json(await getStore().listContracts());
}

export async function getContract(req, res) {
  const contract = await getStore().getContract(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'Contrato não encontrado' });
  }
  return res.json(contract);
}

function clientDisplayName(client) {
  if (!client) return 'Cliente';
  return (
    client.tradeName ||
    client.legalName ||
    client.legalRepName ||
    client.email ||
    'Cliente'
  );
}

function commercialNotifyFields(contract = {}) {
  return {
    setupEnabled: contract.setupEnabled,
    setupPrice: contract.setupPrice,
    setupTitle: contract.setupTitle,
    feeEnabled: contract.feeEnabled,
    feePrice: contract.feePrice,
    feeTitle: contract.feeTitle,
    commissionEnabled: contract.commissionEnabled,
    commissionEstimate: contract.commissionEstimate,
    mediaEnabled: contract.mediaEnabled,
    mediaMonthlyBudget: contract.mediaMonthlyBudget,
  };
}

async function notifyInternalContractCreated(store, contract) {
  if (!emailConfigured() || !contract) return;
  try {
    const client = contract.clientId
      ? await store.getClient(contract.clientId)
      : null;
    const clientName = clientDisplayName(client);
    const adminUrl = `${appBaseUrl()}/admin/contratos/${contract.id}`;
    const { subject, html } = buildInternalContractCreatedEmail({
      clientName,
      contractNumber: contract.number,
      adminUrl,
      ...commercialNotifyFields(contract),
    });
    await sendEmail({
      to: internalContractNotifyRecipients(),
      subject,
      html,
    });
    if (store.addSignatureEvent) {
      await store.addSignatureEvent(contract.id, 'internal_created_email', {
        to: internalContractNotifyRecipients(),
      });
    }
  } catch (err) {
    console.error('E-mail interno (contrato gerado) falhou:', err.message);
    if (store.addSignatureEvent) {
      try {
        await store.addSignatureEvent(contract.id, 'email_failed', {
          stage: 'internal_created',
          message: err.message,
        });
      } catch {
        /* ignore */
      }
    }
  }
}

async function notifyInternalContractSigned(store, contract, extras = {}) {
  if (!emailConfigured() || !contract) return;
  try {
    const client = contract.clientId
      ? await store.getClient(contract.clientId)
      : null;
    const clientName = clientDisplayName(client);
    const { subject, html } = buildInternalContractSignedEmail({
      clientName,
      contractNumber: contract.number,
      signerName: extras.signerName || contract.signerName,
      signerEmail: extras.signerEmail || contract.signerEmail,
      signedAt: extras.signedAt || contract.signedAt,
      viewUrl: extras.viewUrl,
      ...commercialNotifyFields(contract),
    });
    await sendEmail({
      to: internalContractNotifyRecipients(),
      subject,
      html,
      attachments: extras.pdfBuffer
        ? [
            {
              filename: `contrato-${contract.number || contract.id}-assinado.pdf`,
              content: extras.pdfBuffer,
            },
          ]
        : undefined,
    });
    if (store.addSignatureEvent) {
      await store.addSignatureEvent(contract.id, 'internal_signed_email', {
        to: internalContractNotifyRecipients(),
      });
    }
  } catch (err) {
    console.error('E-mail interno (contrato assinado) falhou:', err.message);
    if (store.addSignatureEvent) {
      try {
        await store.addSignatureEvent(contract.id, 'email_failed', {
          stage: 'internal_signed',
          message: err.message,
        });
      } catch {
        /* ignore */
      }
    }
  }
}

export async function createContract(req, res) {
  const store = getStore();
  const contract = await store.createContract(req.body || {});
  if (store.syncContractFinance) {
    await store.syncContractFinance(contract.id);
  }
  await notifyInternalContractCreated(store, contract);
  return res.status(201).json(contract);
}

export async function updateContract(req, res) {
  const store = getStore();
  const contract = await store.updateContract(req.params.id, req.body || {});
  if (!contract) {
    return res.status(404).json({ error: 'Contrato não encontrado' });
  }
  if (store.syncContractFinance) {
    await store.syncContractFinance(contract.id);
  }
  return res.json(contract);
}

export async function convertProposal(req, res) {
  const store = getStore();
  const proposal = await store.getProposal(req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });

  const existing = await store.getContractByProposal(proposal.id);
  if (existing) {
    return res.status(200).json({ proposal, contract: existing, reused: true });
  }

  const body = req.body || {};

  let client = null;
  if (body.clientId) {
    client = await store.getClient(body.clientId);
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
    if (body.client) {
      client = await store.updateClient(client.id, body.client);
    }
  } else if (body.client) {
    client = await store.createClient(body.client);
  } else {
    return res
      .status(400)
      .json({ error: 'Informe clientId ou os dados do cliente (client)' });
  }

  // Contrato gerado fica em rascunho; só vira ativo após assinatura.
  const contract = await store.createContract({
    ...(body.contract || {}),
    proposalId: proposal.id,
    clientId: client.id,
    status: 'draft',
  });

  const updatedProposal = await store.updateProposal(proposal.id, {
    clientId: client.id,
    pipelineStatus: 'negotiating',
    ...(proposal.status === 'won' ? { status: 'sent' } : {}),
  });

  if (store.applyPipelineToContract) {
    await store.applyPipelineToContract(proposal.id, 'negotiating');
  }

  await notifyInternalContractCreated(store, contract);

  return res.status(201).json({
    proposal: updatedProposal,
    client,
    contract,
  });
}

export async function listComercial(_req, res) {
  return res.json(await getStore().listComercial());
}

export async function listFunnelProjects(req, res) {
  return res.json(
    await getStore().listFunnelProjects({
      clientId: req.query.clientId,
    }),
  );
}

export async function createFunnelProject(req, res) {
  const store = getStore();
  const clientId = String(req.body?.clientId || '').trim();
  if (!clientId) {
    return res.status(400).json({ error: 'clientId é obrigatório' });
  }
  const name = String(req.body?.name || '').trim();
  if (name.length < 2) {
    return res.status(400).json({ error: 'Nome do funil é obrigatório' });
  }
  const client = await store.getClient(clientId);
  if (!client) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }
  if (client.archivedAt) {
    return res.status(400).json({ error: 'Cliente arquivado' });
  }
  const project = await store.createFunnelProject({
    clientId,
    proposalId: req.body?.proposalId || null,
    name,
    graph: req.body?.graph || defaultFunnelGraph(),
  });
  return res.status(201).json(project);
}

export async function getFunnelProject(req, res) {
  const project = await getStore().getFunnelProject(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Projeto de funil não encontrado' });
  }
  return res.json(project);
}

export async function updateFunnelProject(req, res) {
  const existing = await getStore().getFunnelProject(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Projeto de funil não encontrado' });
  }
  if (req.body?.name != null && String(req.body.name).trim().length < 2) {
    return res.status(400).json({ error: 'Nome do funil é obrigatório' });
  }
  if (
    req.body?.graph != null &&
    (!req.body.graph.nodes || !req.body.graph.edges)
  ) {
    return res.status(400).json({ error: 'graph inválido' });
  }
  const project = await getStore().updateFunnelProject(req.params.id, {
    clientId: req.body?.clientId,
    proposalId: req.body?.proposalId,
    name: req.body?.name,
    graph: req.body?.graph,
  });
  return res.json(project);
}

export async function listFinanceCategories(_req, res) {
  return res.json(await getStore().listFinanceCategories());
}

export async function createFinanceCategory(req, res) {
  const { name, kind } = req.body || {};
  if (!name || !['income', 'expense'].includes(kind)) {
    return res.status(400).json({ error: 'name e kind (income|expense) obrigatórios' });
  }
  return res
    .status(201)
    .json(await getStore().createFinanceCategory({ name, kind }));
}

export async function listFinanceEntries(req, res) {
  return res.json(
    await getStore().listFinanceEntries({
      type: req.query.type,
      status: req.query.status,
      clientId: req.query.clientId,
      contractId: req.query.contractId,
      from: req.query.from,
      to: req.query.to,
    }),
  );
}

export async function createFinanceEntry(req, res) {
  const entry = await getStore().createFinanceEntry(req.body || {});
  return res.status(201).json(entry);
}

export async function updateFinanceEntry(req, res) {
  const entry = await getStore().updateFinanceEntry(
    req.params.id,
    req.body || {},
  );
  if (!entry) {
    return res.status(404).json({ error: 'Lançamento não encontrado' });
  }
  return res.json(entry);
}

export async function syncContractFinance(req, res) {
  const entries = await getStore().syncContractFinance(req.params.id);
  if (!entries) {
    return res.status(404).json({ error: 'Contrato não encontrado' });
  }
  return res.json(entries);
}

export async function getCashflow(req, res) {
  return res.json(
    await getStore().getCashflow({
      from: req.query.from,
      to: req.query.to,
    }),
  );
}

export async function getAsaasFinanceOverview(_req, res) {
  try {
    return res.json(await buildAsaasOverview(getStore()));
  } catch (err) {
    const status = err.status && err.status < 500 ? err.status : 502;
    return res.status(status).json({ error: err.message });
  }
}

export async function listAsaasFinancePayments(req, res) {
  try {
    return res.json(
      await listAsaasPaymentsForUi(getStore(), {
        status: req.query.status,
        limit: req.query.limit,
        offset: req.query.offset,
      }),
    );
  } catch (err) {
    const status = err.status && err.status < 500 ? err.status : 502;
    return res.status(status).json({ error: err.message });
  }
}

export async function syncAsaasFinance(req, res) {
  try {
    const days = Number(req.body?.days) || 90;
    const result = await syncAsaasPayments(getStore(), { days });
    return res.json(result);
  } catch (err) {
    const status = err.status && err.status < 500 ? err.status : 502;
    return res.status(status).json({ error: err.message });
  }
}

export async function chargeContractAsaas(req, res) {
  try {
    const result = await chargeContractSetupAndFee(
      getStore(),
      req.params.id,
    );
    return res.json(result);
  } catch (err) {
    const status = err.status && err.status < 500 ? err.status : 400;
    return res.status(status).json({ error: err.message });
  }
}

export async function chargeContractCommission(req, res) {
  try {
    const result = await chargeCommission(
      getStore(),
      req.params.id,
      req.body || {},
    );
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status && err.status < 500 ? err.status : 400;
    return res.status(status).json({ error: err.message });
  }
}

export async function asaasWebhook(req, res) {
  const expected = String(process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
  if (expected) {
    const token =
      req.headers['asaas-access-token'] ||
      req.query.token ||
      req.headers['x-asaas-token'];
    if (String(token || '') !== expected) {
      return res.status(401).json({ error: 'Webhook não autorizado' });
    }
  }

  const event = req.body?.event;
  const payment = req.body?.payment;
  if (!event || !payment) {
    return res.status(400).json({ error: 'Payload inválido' });
  }

  try {
    const entry = await applyAsaasPaymentEvent(getStore(), event, payment);
    return res.json({ ok: true, entryId: entry?.id || null });
  } catch (err) {
    console.error('Webhook Asaas falhou:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getPublicContract(req, res) {
  const store = getStore();
  const contract = await store.getContractBySlug(req.params.slug);
  if (!contract) {
    return res.status(404).json({ error: 'Contrato não encontrado' });
  }
  const settings = await store.getSettings();
  const client = contract.clientId
    ? await store.getClient(contract.clientId)
    : null;
  return res.json({
    contract: stripSigningSecrets(contract),
    settings,
    client,
  });
}

const signRate = new Map();

function checkSignRate(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const max = 20;
  const entry = signRate.get(key) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  signRate.set(key, entry);
  return entry.count <= max;
}

export async function sendContract(req, res) {
  const store = getStore();
  const contract = await store.getContract(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'Contrato não encontrado' });
  }
  if (contract.status === 'cancelled' || contract.status === 'churn') {
    return res
      .status(400)
      .json({ error: 'Contrato cancelado não pode ser enviado para assinatura' });
  }
  if (contract.signedAt || contract.status === 'signed') {
    return res.status(400).json({ error: 'Contrato já está assinado' });
  }

  const client = contract.clientId
    ? await store.getClient(contract.clientId)
    : null;
  if (!client?.email) {
    return res.status(400).json({
      error: 'Cliente sem e-mail cadastrado. Atualize o contato antes de enviar.',
    });
  }

  if (!emailConfigured()) {
    return res.status(503).json({
      error:
        'Envio de e-mail não configurado. Defina RESEND_API_KEY e EMAIL_FROM na API.',
    });
  }

  const token = createSigningToken();
  const expiresAt = signingExpiresAt();
  const updated = await store.prepareContractForSend(contract.id, {
    token,
    expiresAt,
  });
  const settings = await store.getSettings();
  const signUrl = `${appBaseUrl()}/assinar/${token}`;
  const company =
    settings?.legalName || settings?.companyName || 'Symbius';
  const { subject, html } = buildReadyToSignEmail({
    clientName: client.tradeName || client.legalName || client.legalRepName,
    contractNumber: updated.number,
    companyName: company,
    signUrl,
  });

  try {
    await sendEmail({ to: client.email, subject, html });
    await store.addSignatureEvent(contract.id, 'sent', {
      to: client.email,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    await store.addSignatureEvent(contract.id, 'email_failed', {
      stage: 'send',
      message: err.message,
    });
    return res.status(502).json({
      error: err.message || 'Falha ao enviar e-mail',
    });
  }

  return res.json({
    contract: stripSigningSecrets(updated),
    signUrl,
    expiresAt: expiresAt.toISOString(),
  });
}

export async function getContractSignature(req, res) {
  const store = getStore();
  const contract = await store.getContract(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'Contrato não encontrado' });
  }
  const events = await store.listSignatureEvents(contract.id);
  return res.json({
    signature: {
      ...publicSignatureView(contract),
      signerIp: contract.signerIp || '',
      signerUserAgent: contract.signerUserAgent || '',
      signingTokenExpiresAt: contract.signingTokenExpiresAt || null,
      hasActiveToken: Boolean(contract.signingToken),
    },
    events,
  });
}

export async function downloadSignedPdf(req, res) {
  const store = getStore();
  const contract = await store.getContract(req.params.id);
  if (!contract || (!contract.signedAt && contract.status !== 'signed')) {
    return res.status(404).json({ error: 'PDF assinado não encontrado' });
  }

  const settings = await store.getSettings();
  const client = contract.clientId
    ? await store.getClient(contract.clientId)
    : null;

  try {
    const pdf = await regenerateSignedContractPdf({
      contract,
      client,
      settings,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="contrato-${contract.number || contract.id}-assinado.pdf"`,
    );
    return res.send(pdf.buffer);
  } catch (err) {
    console.error('Regenerar PDF assinado falhou:', err);
    if (!contract.signedPdfPath) {
      return res.status(500).json({ error: 'Falha ao gerar PDF assinado' });
    }
    const abs = resolveSignedPdfAbsolute(contract.signedPdfPath);
    if (!abs) {
      return res.status(404).json({ error: 'Arquivo do PDF não encontrado' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="contrato-${contract.number || contract.id}-assinado.pdf"`,
    );
    return res.sendFile(abs);
  }
}

export async function getPublicSign(req, res) {
  const store = getStore();
  const contract = await store.getContractBySigningToken(req.params.token);
  if (!contract) {
    return res.status(404).json({ error: 'Link de assinatura inválido' });
  }

  const alreadySigned =
    Boolean(contract.signedAt) || contract.status === 'signed';
  if (alreadySigned) {
    return res.status(410).json({
      error: 'Este contrato já foi assinado',
      code: 'ALREADY_SIGNED',
      contract: stripSigningSecrets(contract),
    });
  }

  if (isSigningTokenExpired(contract.signingTokenExpiresAt)) {
    return res.status(410).json({
      error: 'Link de assinatura expirado. Solicite um novo envio.',
      code: 'EXPIRED',
    });
  }

  const settings = await store.getSettings();
  const client = contract.clientId
    ? await store.getClient(contract.clientId)
    : null;

  await store.addSignatureEvent(contract.id, 'viewed', {
    ip: clientIp(req),
  });

  return res.json({
    contract: stripSigningSecrets(contract),
    settings,
    client: client
      ? {
          id: client.id,
          tradeName: client.tradeName,
          legalName: client.legalName,
          email: client.email,
          legalRepName: client.legalRepName,
          legalRepDocument: client.legalRepDocument,
        }
      : null,
    expiresAt: contract.signingTokenExpiresAt,
  });
}

export async function postPublicSign(req, res) {
  const ip = clientIp(req);
  if (!checkSignRate(ip)) {
    return res
      .status(429)
      .json({ error: 'Muitas tentativas. Aguarde um momento e tente de novo.' });
  }

  const store = getStore();
  const contract = await store.getContractBySigningToken(req.params.token);
  if (!contract) {
    return res.status(404).json({ error: 'Link de assinatura inválido' });
  }

  if (Boolean(contract.signedAt) || contract.status === 'signed') {
    return res.status(410).json({ error: 'Este contrato já foi assinado' });
  }

  if (isSigningTokenExpired(contract.signingTokenExpiresAt)) {
    return res.status(410).json({
      error: 'Link de assinatura expirado. Solicite um novo envio.',
      code: 'EXPIRED',
    });
  }

  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const document = String(body.document || '').trim();
  const accepted = body.accepted === true;

  if (!accepted) {
    return res
      .status(400)
      .json({ error: 'É necessário aceitar os termos do contrato' });
  }
  if (name.length < 3) {
    return res.status(400).json({ error: 'Informe o nome completo do signatário' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Informe um e-mail válido' });
  }

  const settings = await store.getSettings();
  const client = contract.clientId
    ? await store.getClient(contract.clientId)
    : null;
  const contentHash = hashContractContent(contract);
  const signedAt = new Date().toISOString();
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 500);

  let signedPdfPath = '';
  let pdfBuffer = null;
  try {
    const pdf = await generateSignedContractPdf({
      contract,
      client,
      settings,
      signature: {
        signerName: name,
        signerEmail: email,
        signerDocument: document,
        signedAt,
        signerIp: ip,
        signerUserAgent: userAgent,
        contentHash,
      },
    });
    signedPdfPath = pdf.relativePath.replace(/\\/g, '/');
    pdfBuffer = pdf.buffer;
  } catch (err) {
    console.error('PDF assinado falhou:', err);
  }

  const signed = await store.applyContractSignature(contract.id, {
    signedAt,
    signerName: name,
    signerEmail: email,
    signerDocument: document,
    signerIp: ip,
    signerUserAgent: userAgent,
    contentHash,
    signedPdfPath,
  });

  await store.addSignatureEvent(contract.id, 'signed', {
    signerName: name,
    signerEmail: email,
    contentHash,
  });

  // Assinatura → cliente ativo + agenda financeira + cobrança Asaas
  if (signed.proposalId) {
    await store.updateProposal(signed.proposalId, {
      status: 'won',
      pipelineStatus: 'active',
    });
    if (store.applyPipelineToContract) {
      await store.applyPipelineToContract(signed.proposalId, 'active');
    }
  } else if (store.syncContractFinance) {
    await store.syncContractFinance(signed.id);
  }

  try {
    const asaasResult = await chargeContractSetupAndFee(store, signed.id);
    await store.addSignatureEvent(contract.id, 'asaas_charged', {
      customerId: asaasResult?.customerId || null,
      setupPaymentId: asaasResult?.setupPayment?.id || null,
      subscriptionId: asaasResult?.subscription?.id || null,
    });
  } catch (err) {
    console.error('Asaas pós-assinatura falhou:', err);
    await store.addSignatureEvent(contract.id, 'asaas_failed', {
      message: err.message,
    });
  }

  const company =
    settings?.legalName || settings?.companyName || 'Symbius';
  const viewUrl = `${appBaseUrl()}/c/${signed.publicSlug}`;
  const { subject, html } = buildSignedEmail({
    clientName: name,
    contractNumber: signed.number,
    companyName: company,
    viewUrl,
  });

  const recipients = [email];
  if (
    settings?.contactEmail &&
    settings.contactEmail.toLowerCase() !== email
  ) {
    recipients.push(settings.contactEmail);
  }

  if (emailConfigured()) {
    try {
      await sendEmail({
        to: recipients,
        subject,
        html,
        attachments: pdfBuffer
          ? [
              {
                filename: `contrato-${signed.number || signed.id}-assinado.pdf`,
                content: pdfBuffer,
              },
            ]
          : undefined,
      });
    } catch (err) {
      await store.addSignatureEvent(contract.id, 'email_failed', {
        stage: 'signed_copy',
        message: err.message,
      });
    }
  }

  await notifyInternalContractSigned(store, signed, {
    signerName: name,
    signerEmail: email,
    signedAt,
    viewUrl,
    pdfBuffer,
  });

  const fresh = (await store.getContract(signed.id)) || signed;

  return res.json({
    contract: stripSigningSecrets(fresh),
    viewUrl,
    downloadUrl: signedPdfPath
      ? `/api/public/contracts/${signed.publicSlug}/signed-pdf`
      : null,
  });
}

export async function getPublicSignedPdfBySlug(req, res) {
  const store = getStore();
  const contract = await store.getContractBySlug(req.params.slug);
  if (!contract || (!contract.signedAt && contract.status !== 'signed')) {
    return res.status(404).json({ error: 'Contrato assinado não encontrado' });
  }

  const settings = await store.getSettings();
  const client = contract.clientId
    ? await store.getClient(contract.clientId)
    : null;

  try {
    const pdf = await regenerateSignedContractPdf({
      contract,
      client,
      settings,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="contrato-${contract.number || contract.id}-assinado.pdf"`,
    );
    return res.send(pdf.buffer);
  } catch (err) {
    console.error('Regenerar PDF público falhou:', err);
    if (!contract.signedPdfPath) {
      return res.status(500).json({ error: 'Falha ao gerar PDF assinado' });
    }
    const abs = resolveSignedPdfAbsolute(contract.signedPdfPath);
    if (!abs) {
      return res.status(404).json({ error: 'Arquivo do PDF não encontrado' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="contrato-${contract.number || contract.id}-assinado.pdf"`,
    );
    return res.sendFile(abs);
  }
}
