import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { customAlphabet } from 'nanoid';
import { randomUUID } from 'crypto';
import {
  buildContractSchedule,
  DEFAULT_FINANCE_CATEGORIES,
  resolveEntryStatus,
  parseBRDate,
  toISODate,
  resolvePipelineStatus,
  resolveLegacyStage,
  contractStatusFromPipeline,
  CLOSED_PIPELINES,
  isContractOrigin,
  summarizeLeadFinance,
} from './financeSync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
const dataFile = path.join(dataDir, 'db.json');
const slugId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

const SETUP_SERVICES = [
  'Diagnóstico de Marca',
  'Auditoria de Canais Digitais',
  'Pesquisa de Público-Alvo',
  'Posicionamento de Marca',
  'Naming',
  'Identidade Visual',
  'Redesign de Marca',
  'Manual de Marca',
  'Site Institucional',
  'Landing Page',
  'Implantação de CRM',
  'Implantação de E-commerce',
  'Kit de Criativos de Lançamento',
  'Copy Institucional',
  'Configuração de Analytics/Tags de Rastreamento',
  'Integração de Ferramentas (WhatsApp, ERP, pixel, etc.)',
];

const OPERATION_SERVICES = [
  'Gestão de Tráfego Pago (Meta Ads)',
  'Gestão de Tráfego Pago (Google Ads)',
  'Social Media',
  'Produção de Criativos',
  'Automação de CRM',
  'Follow-up de Leads',
  'Copywriting de Campanhas',
  'Teste A/B de Campanhas',
  'Dashboard de BI',
  'Relatório de Performance',
  'Reunião Mensal de Acompanhamento',
  'Otimização de Funil',
  'Gestão de E-commerce (operação pós-implantação)',
  'Email Marketing / Automação de Fluxos',
];

function defaultDb() {
  const services = [
    ...SETUP_SERVICES.map((name, i) => ({
      id: randomUUID(),
      name,
      block: 'setup',
      active: true,
      sortOrder: (i + 1) * 10,
    })),
    ...OPERATION_SERVICES.map((name, i) => ({
      id: randomUUID(),
      name,
      block: 'operacao',
      active: true,
      sortOrder: (i + 1) * 10,
    })),
  ];

  return {
    settings: {
      companyName: 'Symbius',
      contactEmail: 'contato@symbius.com.br',
      contactPhone: '(11) 99999-9999',
      contactWebsite: 'www.symbius.com.br',
      logoUrl: '/images/logotipo-branco.png',
      defaultResponsible: '',
      whatsappNumber: '5511999999999',
      legalName: 'Symbius',
      legalDocument: '',
      legalAddress: '',
      legalRepName: '',
      legalRepRole: '',
    },
    services,
    proposals: [],
    clients: [],
    funnelProjects: [],
    contracts: [],
    financeCategories: DEFAULT_FINANCE_CATEGORIES.map(({ key, ...rest }) => ({
      id: randomUUID(),
      ...rest,
      key,
    })),
    financeEntries: [],
    contractSignatureEvents: [],
  };
}

function ensureFinance(db) {
  if (!Array.isArray(db.clients)) db.clients = [];
  if (!Array.isArray(db.funnelProjects)) db.funnelProjects = [];
  if (!Array.isArray(db.contracts)) db.contracts = [];
  if (!Array.isArray(db.contractSignatureEvents)) db.contractSignatureEvents = [];
  if (!Array.isArray(db.financeCategories) || db.financeCategories.length === 0) {
    db.financeCategories = DEFAULT_FINANCE_CATEGORIES.map(({ key, ...rest }) => ({
      id: randomUUID(),
      ...rest,
      key,
    }));
  }
  if (!Array.isArray(db.financeEntries)) db.financeEntries = [];
  db.settings = {
    legalName: db.settings?.companyName || 'Symbius',
    legalDocument: '',
    legalAddress: '',
    legalRepName: '',
    legalRepRole: '',
    ...db.settings,
  };
  return db;
}

function readDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    const db = defaultDb();
    fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf8');
    return db;
  }
  return ensureFinance(JSON.parse(fs.readFileSync(dataFile, 'utf8')));
}

function writeDb(db) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf8');
}

function nextNumber(proposals) {
  const year = new Date().getFullYear();
  const prefix = `SYM-${year}-`;
  const seqs = proposals
    .filter((p) => p.number?.startsWith(prefix))
    .map((p) => Number(p.number.split('-').pop()))
    .filter((n) => !Number.isNaN(n));
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

function nextContractNumber(contracts) {
  const year = new Date().getFullYear();
  const prefix = `CTR-${year}-`;
  const seqs = contracts
    .filter((c) => c.number?.startsWith(prefix))
    .map((c) => Number(c.number.split('-').pop()))
    .filter((n) => !Number.isNaN(n));
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export const fileStore = {
  mode: 'file',

  async getSettings() {
    return readDb().settings;
  },

  async updateSettings(patch) {
    const db = readDb();
    db.settings = { ...db.settings, ...patch };
    writeDb(db);
    return db.settings;
  },

  async listServices() {
    return readDb().services.sort((a, b) => {
      if (a.block !== b.block) return a.block.localeCompare(b.block);
      return a.sortOrder - b.sortOrder;
    });
  },

  async createService({ name, block }) {
    const db = readDb();
    const same = db.services.filter((s) => s.block === block);
    const sortOrder =
      (same.reduce((m, s) => Math.max(m, s.sortOrder), 0) || 0) + 10;
    const service = {
      id: randomUUID(),
      name: name.trim(),
      block,
      active: true,
      sortOrder,
    };
    db.services.push(service);
    writeDb(db);
    return service;
  },

  async patchService(id, patch) {
    const db = readDb();
    const idx = db.services.findIndex((s) => s.id === id);
    if (idx < 0) return null;
    db.services[idx] = { ...db.services[idx], ...patch };
    writeDb(db);
    return db.services[idx];
  },

  async listProposals() {
    return [...readDb().proposals]
      .filter((p) => p.status !== 'archived')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getProposal(id) {
    return readDb().proposals.find((p) => p.id === id) || null;
  },

  async getProposalBySlug(slug) {
    return readDb().proposals.find((p) => p.publicSlug === slug) || null;
  },

  async createProposal(input) {
    const db = readDb();
    const now = new Date().toISOString();
    const proposal = {
      id: randomUUID(),
      number: nextNumber(db.proposals),
      publicSlug: slugId(),
      status: input.status || 'draft',
      template: input.template || 'brandgrowth',
      clientName: input.clientName || '',
      responsibleName: input.responsibleName || '',
      date: input.date || new Date().toLocaleDateString('pt-BR'),
      title: input.title || '',
      subtitle: input.subtitle || '',
      manifesto: input.manifesto || '',
      scopeItems: input.scopeItems || [],
      setupEnabled: input.setupEnabled ?? true,
      setupTitle: input.setupTitle || 'Setup',
      setupPrice: Number(input.setupPrice ?? 0),
      setupFooter: input.setupFooter || '',
      setupServiceIds: input.setupServiceIds || [],
      operationEnabled: input.operationEnabled ?? true,
      operationTitle: input.operationTitle || 'Operação BrandGrowth',
      operationPrice: Number(input.operationPrice ?? 0),
      operationFooter: input.operationFooter || '',
      operationServiceIds: input.operationServiceIds || [],
      trafficEnabled: input.trafficEnabled ?? false,
      trafficPrice: Number(input.trafficPrice ?? 0),
      trafficFooter:
        input.trafficFooter || 'Gestão de mídia (mídia à parte)',
      blankItems: input.blankItems || [],
      observations: input.observations || [],
      clientId: input.clientId || null,
      createdAt: now,
      updatedAt: now,
    };
    db.proposals.push(proposal);
    writeDb(db);
    return proposal;
  },

  async updateProposal(id, patch) {
    const db = readDb();
    const idx = db.proposals.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    const current = db.proposals[idx];
    const next = {
      ...current,
      ...Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined),
      ),
      updatedAt: new Date().toISOString(),
    };
    if (patch.setupPrice != null) next.setupPrice = Number(patch.setupPrice);
    if (patch.operationPrice != null) {
      next.operationPrice = Number(patch.operationPrice);
    }
    if (patch.trafficPrice != null) {
      next.trafficPrice = Number(patch.trafficPrice);
    }
    db.proposals[idx] = next;
    writeDb(db);
    return next;
  },

  async archiveProposal(id) {
    const db = readDb();
    const idx = db.proposals.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    const proposal = db.proposals[idx];
    if (proposal.status === 'archived') return proposal;

    const contract =
      [...db.contracts]
        .filter((c) => c.proposalId === id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] ||
      null;
    const pipeline = resolvePipelineStatus(proposal, contract);
    if (pipeline === 'active') {
      const err = new Error(
        'Oportunidade ativa: use Arquivar cliente ou marque como Churn.',
      );
      err.status = 400;
      throw err;
    }

    const now = new Date().toISOString();
    db.proposals[idx] = {
      ...proposal,
      status: 'archived',
      pipelineStatus: 'lost',
      updatedAt: now,
    };
    writeDb(db);
    if (contract && this.applyPipelineToContract) {
      await this.applyPipelineToContract(id, 'lost');
    }
    return db.proposals[idx];
  },

  async listClients() {
    return [...readDb().clients]
      .filter((c) => !c.archivedAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async listClientsIncludingArchived() {
    return [...readDb().clients].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  },

  async getClient(id) {
    return readDb().clients.find((c) => c.id === id) || null;
  },

  async archiveClient(id) {
    const db = readDb();
    const idx = db.clients.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    const already = Boolean(db.clients[idx].archivedAt);
    if (!already) {
      const now = new Date().toISOString();
      db.clients[idx] = {
        ...db.clients[idx],
        archivedAt: now,
        updatedAt: now,
      };
      for (let i = 0; i < db.proposals.length; i += 1) {
        if (db.proposals[i].clientId === id) {
          db.proposals[i] = {
            ...db.proposals[i],
            status: 'lost',
            pipelineStatus: 'lost',
            updatedAt: now,
          };
        }
      }
      const contractIds = new Set();
      for (let i = 0; i < db.contracts.length; i += 1) {
        if (
          db.contracts[i].clientId === id &&
          db.contracts[i].status !== 'cancelled'
        ) {
          db.contracts[i] = {
            ...db.contracts[i],
            status: 'cancelled',
            updatedAt: now,
          };
          contractIds.add(db.contracts[i].id);
        }
      }
      db.financeEntries = db.financeEntries.map((e) => {
        const linked =
          e.clientId === id || (e.contractId && contractIds.has(e.contractId));
        if (!linked) return e;
        if (['received', 'paid', 'cancelled'].includes(e.status)) return e;
        return { ...e, status: 'cancelled', updatedAt: now };
      });
      writeDb(db);
      const proposalIds = db.proposals
        .filter((p) => p.clientId === id)
        .map((p) => p.id);
      for (const proposalId of proposalIds) {
        if (this.applyPipelineToContract) {
          await this.applyPipelineToContract(proposalId, 'lost');
        }
      }
    }
    return readDb().clients.find((c) => c.id === id) || null;
  },

  async createClient(input) {
    const db = readDb();
    const now = new Date().toISOString();
    const client = {
      id: randomUUID(),
      legalName: input.legalName || '',
      tradeName: input.tradeName || '',
      documentType: input.documentType || 'cnpj',
      document: input.document || '',
      email: input.email || '',
      phone: input.phone || '',
      whatsapp: input.whatsapp || '',
      street: input.street || '',
      number: input.number || '',
      complement: input.complement || '',
      district: input.district || '',
      city: input.city || '',
      state: input.state || '',
      zip: input.zip || '',
      legalRepName: input.legalRepName || '',
      legalRepRole: input.legalRepRole || '',
      legalRepDocument: input.legalRepDocument || '',
      notes: input.notes || '',
      archivedAt: null,
      asaasCustomerId: input.asaasCustomerId || '',
      createdAt: now,
      updatedAt: now,
    };
    db.clients.push(client);
    writeDb(db);
    return client;
  },

  async updateClient(id, patch) {
    const db = readDb();
    const idx = db.clients.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    const { archivedAt: _ignore, ...safePatch } = patch;
    const next = {
      ...db.clients[idx],
      ...Object.fromEntries(
        Object.entries(safePatch).filter(([, v]) => v !== undefined),
      ),
      updatedAt: new Date().toISOString(),
    };
    db.clients[idx] = next;
    writeDb(db);
    return next;
  },

  async listContracts() {
    const clients = Object.fromEntries(
      readDb().clients.map((c) => [c.id, c]),
    );
    return [...readDb().contracts]
      .filter((c) => {
        if (!c.clientId) return true;
        const client = clients[c.clientId];
        return client && !client.archivedAt;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async listContractsIncludingArchived() {
    return [...readDb().contracts].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  },

  async getContract(id) {
    return readDb().contracts.find((c) => c.id === id) || null;
  },

  async getContractBySlug(slug) {
    return readDb().contracts.find((c) => c.publicSlug === slug) || null;
  },

  async getContractBySigningToken(token) {
    if (!token) return null;
    return readDb().contracts.find((c) => c.signingToken === token) || null;
  },

  async prepareContractForSend(id, { token, expiresAt }) {
    return this.updateContract(id, {
      signingToken: token,
      signingTokenExpiresAt: expiresAt.toISOString(),
      status: 'sent',
    });
  },

  async applyContractSignature(id, data) {
    const current = await this.getContract(id);
    if (!current) return null;
    return this.updateContract(id, {
      status: 'signed',
      signedAt: data.signedAt,
      signerName: data.signerName || '',
      signerEmail: data.signerEmail || '',
      signerDocument: data.signerDocument || '',
      signerIp: data.signerIp || '',
      signerUserAgent: data.signerUserAgent || '',
      contentHash: data.contentHash || '',
      signedPdfPath: data.signedPdfPath || '',
      acceptanceClientName: data.signerName || current.acceptanceClientName || '',
      signingToken: null,
      signingTokenExpiresAt: null,
    });
  },

  async addSignatureEvent(contractId, eventType, meta = {}) {
    const db = readDb();
    const event = {
      id: randomUUID(),
      contractId,
      eventType,
      meta,
      createdAt: new Date().toISOString(),
    };
    db.contractSignatureEvents.push(event);
    writeDb(db);
    return event;
  },

  async listSignatureEvents(contractId) {
    return readDb()
      .contractSignatureEvents.filter((e) => e.contractId === contractId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getContractByProposal(proposalId) {
    const list = readDb().contracts.filter((c) => c.proposalId === proposalId);
    if (!list.length) return null;
    return list.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )[0];
  },

  async createContract(input) {
    const db = readDb();
    const now = new Date().toISOString();
    const contract = {
      id: randomUUID(),
      number: nextContractNumber(db.contracts),
      publicSlug: slugId(),
      proposalId: input.proposalId || null,
      clientId: input.clientId || null,
      status: input.status || 'draft',
      title:
        input.title ||
        'Proposta comercial e contrato de prestação de serviços',
      subtitle: input.subtitle || '',
      startDate: input.startDate || '',
      minTermDays: input.minTermDays ?? 90,
      meetingCadenceDays: input.meetingCadenceDays ?? 15,
      objective: input.objective || '',
      scopeItems: input.scopeItems || [],
      providerResponsibilities: input.providerResponsibilities || [],
      clientResponsibilities: input.clientResponsibilities || [],
      outOfScope: input.outOfScope || [],
      meetingTopics: input.meetingTopics || [],
      importantNotes: input.importantNotes || [],
      setupEnabled: input.setupEnabled ?? false,
      setupTitle: input.setupTitle || 'Investimento de setup',
      setupPrice: Number(input.setupPrice ?? 0),
      setupDescription: input.setupDescription || '',
      feeEnabled: input.feeEnabled ?? false,
      feeTitle: input.feeTitle || 'Fee mensal',
      feePrice: Number(input.feePrice ?? 0),
      feeDescription: input.feeDescription || '',
      commissionEnabled: input.commissionEnabled ?? false,
      commissionBaseLabel:
        input.commissionBaseLabel || 'faturamento bruto mensal',
      commissionTiers: input.commissionTiers || [],
      commissionCloseDay: input.commissionCloseDay ?? 5,
      commissionPayDay: input.commissionPayDay ?? 6,
      commissionExamples: input.commissionExamples || [],
      mediaEnabled: input.mediaEnabled ?? false,
      mediaMonthlyBudget: Number(input.mediaMonthlyBudget ?? 0),
      mediaNotes: input.mediaNotes || '',
      acceptanceProviderName: input.acceptanceProviderName || '',
      acceptanceClientName: input.acceptanceClientName || '',
      feePayDay: input.feePayDay ?? 5,
      setupDueDays: input.setupDueDays ?? 0,
      commissionEstimate: Number(input.commissionEstimate ?? 0),
      setupDueDate: input.setupDueDate || '',
      feeFirstDueDate: input.feeFirstDueDate || '',
      asaasBillingType: input.asaasBillingType || 'UNDEFINED',
      asaasSubscriptionId: input.asaasSubscriptionId || '',
      asaasSetupPaymentId: input.asaasSetupPaymentId || '',
      asaasSyncedAt: input.asaasSyncedAt || null,
      signingToken: null,
      signingTokenExpiresAt: null,
      signedAt: null,
      signerName: '',
      signerEmail: '',
      signerDocument: '',
      signerIp: '',
      signerUserAgent: '',
      contentHash: '',
      signedPdfPath: '',
      createdAt: now,
      updatedAt: now,
    };
    db.contracts.push(contract);
    writeDb(db);
    return contract;
  },

  async updateContract(id, patch) {
    const db = readDb();
    const idx = db.contracts.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    const next = {
      ...db.contracts[idx],
      ...Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined),
      ),
      updatedAt: new Date().toISOString(),
    };
    if (patch.setupPrice != null) next.setupPrice = Number(patch.setupPrice);
    if (patch.feePrice != null) next.feePrice = Number(patch.feePrice);
    if (patch.mediaMonthlyBudget != null) {
      next.mediaMonthlyBudget = Number(patch.mediaMonthlyBudget);
    }
    if (patch.commissionEstimate != null) {
      next.commissionEstimate = Number(patch.commissionEstimate);
    }
    db.contracts[idx] = next;
    writeDb(db);
    return next;
  },

  async listFinanceCategories() {
    return readDb().financeCategories;
  },

  async createFinanceCategory({ name, kind }) {
    const db = readDb();
    const category = {
      id: randomUUID(),
      name: name.trim(),
      kind,
      system: false,
      key: null,
    };
    db.financeCategories.push(category);
    writeDb(db);
    return category;
  },

  async listFinanceEntries(filters = {}) {
    const db = readDb();
    let entries = [...db.financeEntries];

    if (!filters.includeClosed) {
      const now = new Date().toISOString();
      const archivedClientIds = new Set(
        db.clients.filter((c) => c.archivedAt).map((c) => c.id),
      );
      const closedContractIds = new Set(
        db.contracts
          .filter((c) => ['cancelled', 'churn'].includes(c.status))
          .map((c) => c.id),
      );
      let changed = false;
      db.financeEntries = db.financeEntries.map((e) => {
        const closed =
          (e.clientId && archivedClientIds.has(e.clientId)) ||
          (e.contractId && closedContractIds.has(e.contractId));
        if (!closed || ['received', 'paid', 'cancelled'].includes(e.status)) {
          return e;
        }
        changed = true;
        return { ...e, status: 'cancelled', updatedAt: now };
      });
      if (changed) writeDb(db);
      entries = [...readDb().financeEntries].filter((e) => {
        if (e.clientId && archivedClientIds.has(e.clientId)) return false;
        if (e.contractId && closedContractIds.has(e.contractId)) return false;
        return true;
      });
    }

    if (filters.type) entries = entries.filter((e) => e.type === filters.type);
    if (filters.origin) {
      entries = entries.filter((e) => e.origin === filters.origin);
    }
    if (filters.clientId) {
      entries = entries.filter((e) => e.clientId === filters.clientId);
    }
    if (filters.contractId) {
      entries = entries.filter((e) => e.contractId === filters.contractId);
    }
    if (filters.from || filters.to) {
      entries = entries.filter((e) => {
        const iso = toISODate(parseBRDate(e.dueDate));
        if (!iso) return true;
        if (filters.from && iso < filters.from) return false;
        if (filters.to && iso > filters.to) return false;
        return true;
      });
    }
    entries = entries.map((e) => {
      const c = e.clientId
        ? db.clients.find((x) => x.id === e.clientId)
        : null;
      const clientName = c ? c.tradeName || c.legalName || '' : '';
      return {
        ...e,
        status: resolveEntryStatus(e),
        clientName,
      };
    });
    if (filters.status) {
      entries = entries.filter((e) => e.status === filters.status);
    }
    return entries.sort((a, b) => {
      const da = toISODate(parseBRDate(a.dueDate));
      const db_ = toISODate(parseBRDate(b.dueDate));
      return da.localeCompare(db_);
    });
  },

  async createFinanceEntry(input) {
    const db = readDb();
    const now = new Date().toISOString();
    const entry = {
      id: randomUUID(),
      type: input.type || 'expense',
      origin: input.origin || 'manual',
      status: input.status || 'scheduled',
      amount: Number(input.amount) || 0,
      dueDate: input.dueDate || '',
      paidAt: input.paidAt || null,
      description: input.description || '',
      categoryId: input.categoryId || null,
      clientId: input.clientId || null,
      contractId: input.contractId || null,
      proposalId: input.proposalId || null,
      recurrenceGroupId: input.recurrenceGroupId || null,
      notes: input.notes || '',
      asaasPaymentId: input.asaasPaymentId || '',
      invoiceUrl: input.invoiceUrl || '',
      billingType: input.billingType || '',
      createdAt: now,
      updatedAt: now,
    };
    db.financeEntries.push(entry);
    writeDb(db);
    return entry;
  },

  async getFinanceEntry(id) {
    const entry = readDb().financeEntries.find((e) => e.id === id);
    return entry ? { ...entry, status: resolveEntryStatus(entry) } : null;
  },

  async getFinanceEntryByAsaasPaymentId(asaasPaymentId) {
    if (!asaasPaymentId) return null;
    const entry = readDb().financeEntries.find(
      (e) => e.asaasPaymentId === asaasPaymentId,
    );
    return entry ? { ...entry, status: resolveEntryStatus(entry) } : null;
  },

  async updateFinanceEntry(id, patch) {
    const db = readDb();
    const idx = db.financeEntries.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    const next = {
      ...db.financeEntries[idx],
      ...Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined),
      ),
      updatedAt: new Date().toISOString(),
    };
    if (patch.amount != null) next.amount = Number(patch.amount);
    db.financeEntries[idx] = next;
    writeDb(db);
    return { ...next, status: resolveEntryStatus(next) };
  },

  async syncContractFinance(contractId) {
    const db = readDb();
    const contract = db.contracts.find((c) => c.id === contractId);
    if (!contract) return null;

    const cats = Object.fromEntries(
      db.financeCategories
        .filter((c) => c.key)
        .map((c) => [c.key, c.id]),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = toISODate(today);

    // Cancel future scheduled contract-origin entries (keep ones already sent to Asaas)
    db.financeEntries = db.financeEntries.map((e) => {
      if (e.contractId !== contractId) return e;
      if (!['contract_setup', 'contract_fee'].includes(e.origin)) {
        return e;
      }
      if (['received', 'paid'].includes(e.status)) return e;
      if (e.asaasPaymentId) return e;
      const dueIso = toISODate(parseBRDate(e.dueDate));
      if (dueIso && dueIso >= todayIso) {
        return { ...e, status: 'cancelled', updatedAt: new Date().toISOString() };
      }
      return e;
    });

    const scheduleClient = contract.clientId
      ? db.clients.find((c) => c.id === contract.clientId)
      : null;
    const clientName =
      scheduleClient?.tradeName || scheduleClient?.legalName || '';
    const schedule = buildContractSchedule(contract, cats, 12, clientName);
    const now = new Date().toISOString();
    const existing = db.financeEntries.filter(
      (e) => e.contractId === contractId && e.status !== 'cancelled',
    );
    for (const item of schedule) {
      const dueIso = toISODate(parseBRDate(item.dueDate));
      if (dueIso && dueIso < todayIso && item.origin !== 'contract_setup') {
        continue;
      }
      const already = existing.some(
        (e) =>
          e.origin === item.origin &&
          (e.asaasPaymentId ||
            toISODate(parseBRDate(e.dueDate)) === dueIso),
      );
      if (already) continue;
      db.financeEntries.push({
        id: randomUUID(),
        ...item,
        asaasPaymentId: item.asaasPaymentId || '',
        invoiceUrl: item.invoiceUrl || '',
        billingType: item.billingType || '',
        createdAt: now,
        updatedAt: now,
      });
    }

    writeDb(db);
    return this.listFinanceEntries({ contractId });
  },

  /** Cancela recebíveis em aberto do contrato (churn/perdido/arquivado) */
  async cancelFutureContractEntries(contractId) {
    const db = readDb();
    const now = new Date().toISOString();
    let changed = 0;

    db.financeEntries = db.financeEntries.map((e) => {
      if (e.contractId !== contractId) return e;
      if (!isContractOrigin(e.origin)) return e;
      if (['received', 'paid', 'cancelled'].includes(e.status)) return e;
      changed += 1;
      return { ...e, status: 'cancelled', updatedAt: now };
    });

    if (changed) writeDb(db);
    return changed;
  },

  /**
   * Mantém o contrato coerente com o pipeline comercial:
   * churn/perdido encerram a agenda, ativo regenera os recebíveis.
   */
  async applyPipelineToContract(proposalId, pipeline) {
    const nextStatus = contractStatusFromPipeline(pipeline);
    if (!nextStatus) return null;

    const db = readDb();
    const contracts = db.contracts.filter((c) => c.proposalId === proposalId);
    if (contracts.length === 0) return null;
    const contract = contracts.reduce((latest, c) =>
      !latest || new Date(c.createdAt) > new Date(latest.createdAt) ? c : latest,
    );

    const previousStatus = contract.status;
    if (previousStatus !== nextStatus) {
      await this.updateContract(contract.id, { status: nextStatus });
    }

    if (CLOSED_PIPELINES.includes(pipeline)) {
      await this.cancelFutureContractEntries(contract.id);
    } else if (pipeline === 'active') {
      const scheduled = (await this.listFinanceEntries({
        contractId: contract.id,
      })).filter(
        (e) => isContractOrigin(e.origin) && e.status !== 'cancelled',
      );
      if (scheduled.length === 0) {
        await this.syncContractFinance(contract.id);
      }
    }

    return this.getContract(contract.id);
  },

  async getCashflow({ from, to } = {}) {
    const entries = await this.listFinanceEntries({ from, to });
    const active = entries.filter((e) => e.status !== 'cancelled');
    const byDay = {};
    for (const e of active) {
      const day = toISODate(parseBRDate(e.dueDate)) || 'unknown';
      if (!byDay[day]) byDay[day] = { date: day, income: 0, expense: 0 };
      if (e.type === 'income') byDay[day].income += Number(e.amount) || 0;
      else byDay[day].expense += Number(e.amount) || 0;
    }
    const days = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    let balance = 0;
    return days.map((d) => {
      balance += d.income - d.expense;
      return { ...d, balance };
    });
  },

  async listComercial() {
    const db = readDb();
    const clients = Object.fromEntries(db.clients.map((c) => [c.id, c]));
    const contractsByProposal = {};
    for (const c of db.contracts) {
      if (!c.proposalId) continue;
      const prev = contractsByProposal[c.proposalId];
      if (!prev || new Date(c.createdAt) > new Date(prev.createdAt)) {
        contractsByProposal[c.proposalId] = c;
      }
    }

    const today = new Date();
    const leads = [...db.proposals]
      .filter((p) => p.status !== 'archived')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .map((proposal) => {
        const contract = contractsByProposal[proposal.id] || null;
        const linkedClientId = proposal.clientId || contract?.clientId || null;
        const linkedClient = linkedClientId ? clients[linkedClientId] : null;
        if (linkedClient?.archivedAt) return null;

        const client =
          linkedClient && !linkedClient.archivedAt ? linkedClient : null;

        let stage = resolveLegacyStage(proposal, contract);
        const pipelineStatus = resolvePipelineStatus(proposal, contract);

        const contractEntries = contract
          ? db.financeEntries.filter((e) => e.contractId === contract.id)
          : [];

        const nextReceivables = contractEntries
          .filter(
            (e) =>
              e.type === 'income' &&
              !['cancelled', 'received', 'paid'].includes(e.status),
          )
          .map((e) => ({ ...e, status: resolveEntryStatus(e, today) }))
          .filter((e) => e.status !== 'cancelled')
          .sort((a, b) =>
            toISODate(parseBRDate(a.dueDate)).localeCompare(
              toISODate(parseBRDate(b.dueDate)),
            ),
          )
          .slice(0, 5);

        return {
          proposal,
          client,
          contract,
          stage,
          pipelineStatus,
          nextReceivables,
          finance: summarizeLeadFinance(contractEntries, today),
        };
      })
      .filter(Boolean);

    return leads;
  },

  async listFunnelProjects(filters = {}) {
    const db = readDb();
    let list = [...db.funnelProjects];
    if (filters.clientId) {
      list = list.filter((item) => item.clientId === filters.clientId);
    }
    return list.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
    );
  },

  async getFunnelProject(id) {
    return readDb().funnelProjects.find((item) => item.id === id) || null;
  },

  async createFunnelProject(input) {
    const db = readDb();
    const now = new Date().toISOString();
    const project = {
      id: randomUUID(),
      clientId: input.clientId,
      proposalId: input.proposalId || null,
      name: String(input.name || 'Funil de aquisição').trim(),
      graph: input.graph || { nodes: [], edges: [] },
      createdAt: now,
      updatedAt: now,
    };
    db.funnelProjects.push(project);
    writeDb(db);
    return project;
  },

  async updateFunnelProject(id, patch) {
    const db = readDb();
    const idx = db.funnelProjects.findIndex((item) => item.id === id);
    if (idx < 0) return null;
    const current = db.funnelProjects[idx];
    const nextGraph =
      patch.graph !== undefined
        ? patch.graph && Array.isArray(patch.graph.nodes) && Array.isArray(patch.graph.edges)
          ? patch.graph
          : current.graph
        : current.graph;
    db.funnelProjects[idx] = {
      ...current,
      clientId:
        patch.clientId !== undefined ? patch.clientId : current.clientId,
      proposalId:
        patch.proposalId !== undefined ? patch.proposalId : current.proposalId,
      name:
        patch.name != null
          ? String(patch.name || '').trim() || current.name
          : current.name,
      graph: nextGraph,
      updatedAt: new Date().toISOString(),
    };
    writeDb(db);
    return db.funnelProjects[idx];
  },
};
