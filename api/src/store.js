import { pool } from './db.js';
import { fileStore } from './fileStore.js';
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
  summarizeLeadFinance,
} from './financeSync.js';

const slugId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

function mapProposal(row) {
  if (!row) return null;
  return {
    id: row.id,
    number: row.number,
    publicSlug: row.public_slug,
    status: row.status,
    template: row.template,
    clientName: row.client_name,
    responsibleName: row.responsible_name,
    date: row.date,
    title: row.title,
    subtitle: row.subtitle,
    manifesto: row.manifesto,
    scopeItems: row.scope_items || [],
    setupEnabled: row.setup_enabled,
    setupTitle: row.setup_title,
    setupPrice: Number(row.setup_price),
    setupFooter: row.setup_footer,
    setupServiceIds: row.setup_service_ids || [],
    operationEnabled: row.operation_enabled,
    operationTitle: row.operation_title,
    operationPrice: Number(row.operation_price),
    operationFooter: row.operation_footer,
    operationServiceIds: row.operation_service_ids || [],
    trafficEnabled: row.traffic_enabled,
    trafficPrice: Number(row.traffic_price),
    trafficFooter: row.traffic_footer,
    blankItems: row.blank_items || [],
    observations: row.observations || [],
    clientId: row.client_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    documentType: row.document_type,
    document: row.document,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    street: row.street,
    number: row.number,
    complement: row.complement,
    district: row.district,
    city: row.city,
    state: row.state,
    zip: row.zip,
    legalRepName: row.legal_rep_name,
    legalRepRole: row.legal_rep_role,
    legalRepDocument: row.legal_rep_document,
    notes: row.notes,
    archivedAt: row.archived_at || null,
    asaasCustomerId: row.asaas_customer_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContract(row) {
  if (!row) return null;
  return {
    id: row.id,
    number: row.number,
    publicSlug: row.public_slug,
    proposalId: row.proposal_id || null,
    clientId: row.client_id || null,
    status: row.status,
    title: row.title,
    subtitle: row.subtitle || '',
    startDate: row.start_date,
    minTermDays: row.min_term_days,
    meetingCadenceDays: row.meeting_cadence_days,
    objective: row.objective,
    scopeItems: row.scope_items || [],
    providerResponsibilities: row.provider_responsibilities || [],
    clientResponsibilities: row.client_responsibilities || [],
    outOfScope: row.out_of_scope || [],
    meetingTopics: row.meeting_topics || [],
    importantNotes: row.important_notes || [],
    setupEnabled: row.setup_enabled,
    setupTitle: row.setup_title,
    setupPrice: Number(row.setup_price),
    setupDescription: row.setup_description,
    feeEnabled: row.fee_enabled,
    feeTitle: row.fee_title,
    feePrice: Number(row.fee_price),
    feeDescription: row.fee_description,
    commissionEnabled: row.commission_enabled,
    commissionBaseLabel: row.commission_base_label,
    commissionTiers: row.commission_tiers || [],
    commissionCloseDay: row.commission_close_day,
    commissionPayDay: row.commission_pay_day,
    commissionExamples: row.commission_examples || [],
    mediaEnabled: row.media_enabled,
    mediaMonthlyBudget: Number(row.media_monthly_budget),
    mediaNotes: row.media_notes,
    acceptanceProviderName: row.acceptance_provider_name,
    acceptanceClientName: row.acceptance_client_name,
    feePayDay: row.fee_pay_day ?? 5,
    setupDueDays: row.setup_due_days ?? 0,
    commissionEstimate: Number(row.commission_estimate || 0),
    setupDueDate: row.setup_due_date || '',
    feeFirstDueDate: row.fee_first_due_date || '',
    asaasBillingType: row.asaas_billing_type || 'UNDEFINED',
    asaasSubscriptionId: row.asaas_subscription_id || '',
    asaasSetupPaymentId: row.asaas_setup_payment_id || '',
    asaasSyncedAt: row.asaas_synced_at || null,
    signingToken: row.signing_token || null,
    signingTokenExpiresAt: row.signing_token_expires_at || null,
    signedAt: row.signed_at || null,
    signerName: row.signer_name || '',
    signerEmail: row.signer_email || '',
    signerDocument: row.signer_document || '',
    signerIp: row.signer_ip || '',
    signerUserAgent: row.signer_user_agent || '',
    contentHash: row.content_hash || '',
    signedPdfPath: row.signed_pdf_path || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFinanceCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    system: row.system,
    key: row.key || null,
  };
}

function mapFinanceEntry(row) {
  if (!row) return null;
  const entry = {
    id: row.id,
    type: row.type,
    origin: row.origin,
    status: row.status,
    amount: Number(row.amount),
    dueDate: row.due_date,
    paidAt: row.paid_at,
    description: row.description,
    categoryId: row.category_id,
    clientId: row.client_id,
    contractId: row.contract_id,
    proposalId: row.proposal_id,
    recurrenceGroupId: row.recurrence_group_id,
    notes: row.notes,
    asaasPaymentId: row.asaas_payment_id || '',
    invoiceUrl: row.invoice_url || '',
    billingType: row.billing_type || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return { ...entry, status: resolveEntryStatus(entry) };
}

function mapService(row) {
  return {
    id: row.id,
    name: row.name,
    block: row.block,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

function mapSettings(row) {
  return {
    companyName: row.company_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactWebsite: row.contact_website,
    logoUrl: row.logo_url,
    defaultResponsible: row.default_responsible,
    whatsappNumber: row.whatsapp_number,
    legalName: row.legal_name,
    legalDocument: row.legal_document,
    legalAddress: row.legal_address,
    legalRepName: row.legal_rep_name,
    legalRepRole: row.legal_rep_role,
  };
}

function mapFunnelProject(row) {
  if (!row) return null;
  let graph = row.graph_json || { nodes: [], edges: [] };
  if (typeof graph === 'string') {
    try {
      graph = JSON.parse(graph);
    } catch {
      graph = { nodes: [], edges: [] };
    }
  }
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    graph = { nodes: [], edges: [] };
  }
  return {
    id: row.id,
    clientId: row.client_id,
    proposalId: row.proposal_id || null,
    name: row.name,
    graph,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function nextProposalNumber() {
  const year = new Date().getFullYear();
  const prefix = `SYM-${year}-`;
  const { rows } = await pool.query(
    `SELECT number FROM proposals WHERE number LIKE $1 ORDER BY number DESC LIMIT 1`,
    [`${prefix}%`],
  );
  let seq = 1;
  if (rows[0]) seq = Number(rows[0].number.split('-').pop()) + 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

async function nextContractNumber() {
  const year = new Date().getFullYear();
  const prefix = `CTR-${year}-`;
  const { rows } = await pool.query(
    `SELECT number FROM contracts WHERE number LIKE $1 ORDER BY number DESC LIMIT 1`,
    [`${prefix}%`],
  );
  let seq = 1;
  if (rows[0]) seq = Number(rows[0].number.split('-').pop()) + 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const pgStore = {
  mode: 'postgres',

  async getSettings() {
    const { rows } = await pool.query('SELECT * FROM settings WHERE id = 1');
    return rows[0] ? mapSettings(rows[0]) : null;
  },

  async updateSettings(b) {
    const { rows } = await pool.query(
      `UPDATE settings SET
        company_name = COALESCE($1, company_name),
        contact_email = COALESCE($2, contact_email),
        contact_phone = COALESCE($3, contact_phone),
        contact_website = COALESCE($4, contact_website),
        logo_url = COALESCE($5, logo_url),
        default_responsible = COALESCE($6, default_responsible),
        whatsapp_number = COALESCE($7, whatsapp_number),
        legal_name = COALESCE($8, legal_name),
        legal_document = COALESCE($9, legal_document),
        legal_address = COALESCE($10, legal_address),
        legal_rep_name = COALESCE($11, legal_rep_name),
        legal_rep_role = COALESCE($12, legal_rep_role),
        updated_at = NOW()
       WHERE id = 1 RETURNING *`,
      [
        b.companyName,
        b.contactEmail,
        b.contactPhone,
        b.contactWebsite,
        b.logoUrl,
        b.defaultResponsible,
        b.whatsappNumber,
        b.legalName,
        b.legalDocument,
        b.legalAddress,
        b.legalRepName,
        b.legalRepRole,
      ],
    );
    return mapSettings(rows[0]);
  },

  async listServices() {
    const { rows } = await pool.query(
      'SELECT * FROM services ORDER BY block, sort_order, name',
    );
    return rows.map(mapService);
  },

  async createService({ name, block }) {
    const { rows: maxRows } = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM services WHERE block = $1',
      [block],
    );
    const { rows } = await pool.query(
      `INSERT INTO services (name, block, sort_order) VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), block, maxRows[0].next],
    );
    return mapService(rows[0]);
  },

  async patchService(id, b) {
    const { rows } = await pool.query(
      `UPDATE services SET
        name = COALESCE($1, name),
        block = COALESCE($2, block),
        active = COALESCE($3, active),
        sort_order = COALESCE($4, sort_order)
       WHERE id = $5 RETURNING *`,
      [b.name, b.block, b.active, b.sortOrder, id],
    );
    return rows[0] ? mapService(rows[0]) : null;
  },

  async listProposals() {
    const { rows } = await pool.query(
      `SELECT * FROM proposals
       WHERE status IS DISTINCT FROM 'archived'
       ORDER BY created_at DESC`,
    );
    return rows.map(mapProposal);
  },

  async getProposal(id) {
    const { rows } = await pool.query('SELECT * FROM proposals WHERE id = $1', [
      id,
    ]);
    return mapProposal(rows[0]);
  },

  async getProposalBySlug(slug) {
    const { rows } = await pool.query(
      'SELECT * FROM proposals WHERE public_slug = $1',
      [slug],
    );
    return mapProposal(rows[0]);
  },

  async createProposal(b) {
    const number = await nextProposalNumber();
    const publicSlug = slugId();
    const { rows } = await pool.query(
      `INSERT INTO proposals (
        number, public_slug, status, template,
        client_name, responsible_name, date, title, subtitle, manifesto, scope_items,
        setup_enabled, setup_title, setup_price, setup_footer, setup_service_ids,
        operation_enabled, operation_title, operation_price, operation_footer, operation_service_ids,
        traffic_enabled, traffic_price, traffic_footer, blank_items, observations, client_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
        $12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,
        $22,$23,$24,$25,$26,$27
      ) RETURNING *`,
      [
        number,
        publicSlug,
        b.status || 'draft',
        b.template || 'brandgrowth',
        b.clientName || '',
        b.responsibleName || '',
        b.date || new Date().toLocaleDateString('pt-BR'),
        b.title || '',
        b.subtitle || '',
        b.manifesto || '',
        JSON.stringify(b.scopeItems || []),
        b.setupEnabled ?? true,
        b.setupTitle || 'Setup',
        b.setupPrice ?? 0,
        b.setupFooter || '',
        JSON.stringify(b.setupServiceIds || []),
        b.operationEnabled ?? true,
        b.operationTitle || 'Operação BrandGrowth',
        b.operationPrice ?? 0,
        b.operationFooter || '',
        JSON.stringify(b.operationServiceIds || []),
        b.trafficEnabled ?? false,
        b.trafficPrice ?? 0,
        b.trafficFooter || 'Gestão de mídia (mídia à parte)',
        JSON.stringify(b.blankItems || []),
        JSON.stringify(b.observations || []),
        b.clientId || null,
      ],
    );
    return mapProposal(rows[0]);
  },

  async updateProposal(id, b) {
    const { rows } = await pool.query(
      `UPDATE proposals SET
        status = COALESCE($1, status),
        template = COALESCE($2, template),
        client_name = COALESCE($3, client_name),
        responsible_name = COALESCE($4, responsible_name),
        date = COALESCE($5, date),
        title = COALESCE($6, title),
        subtitle = COALESCE($7, subtitle),
        manifesto = COALESCE($8, manifesto),
        scope_items = COALESCE($9, scope_items),
        setup_enabled = COALESCE($10, setup_enabled),
        setup_title = COALESCE($11, setup_title),
        setup_price = COALESCE($12, setup_price),
        setup_footer = COALESCE($13, setup_footer),
        setup_service_ids = COALESCE($14, setup_service_ids),
        operation_enabled = COALESCE($15, operation_enabled),
        operation_title = COALESCE($16, operation_title),
        operation_price = COALESCE($17, operation_price),
        operation_footer = COALESCE($18, operation_footer),
        operation_service_ids = COALESCE($19, operation_service_ids),
        traffic_enabled = COALESCE($20, traffic_enabled),
        traffic_price = COALESCE($21, traffic_price),
        traffic_footer = COALESCE($22, traffic_footer),
        blank_items = COALESCE($23, blank_items),
        observations = COALESCE($24, observations),
        client_id = COALESCE($25, client_id),
        updated_at = NOW()
       WHERE id = $26 RETURNING *`,
      [
        b.status,
        b.template,
        b.clientName,
        b.responsibleName,
        b.date,
        b.title,
        b.subtitle,
        b.manifesto,
        b.scopeItems != null ? JSON.stringify(b.scopeItems) : null,
        b.setupEnabled,
        b.setupTitle,
        b.setupPrice,
        b.setupFooter,
        b.setupServiceIds != null ? JSON.stringify(b.setupServiceIds) : null,
        b.operationEnabled,
        b.operationTitle,
        b.operationPrice,
        b.operationFooter,
        b.operationServiceIds != null
          ? JSON.stringify(b.operationServiceIds)
          : null,
        b.trafficEnabled,
        b.trafficPrice,
        b.trafficFooter,
        b.blankItems != null ? JSON.stringify(b.blankItems) : null,
        b.observations != null ? JSON.stringify(b.observations) : null,
        b.clientId ?? null,
        id,
      ],
    );
    return mapProposal(rows[0]);
  },

  /**
   * Arquiva proposta não concluída (some do Comercial / listas).
   * Clientes ativos devem usar arquivar cliente ou churn.
   */
  async archiveProposal(id) {
    const proposal = await this.getProposal(id);
    if (!proposal) return null;
    if (proposal.status === 'archived') return proposal;

    const contract = await this.getContractByProposal?.(id);
    const pipeline = resolvePipelineStatus(proposal, contract);
    if (pipeline === 'active') {
      const err = new Error(
        'Oportunidade ativa: use Arquivar cliente ou marque como Churn.',
      );
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `UPDATE proposals SET status = 'archived', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id],
    );
    if (contract?.id && this.applyPipelineToContract) {
      await this.applyPipelineToContract(id, 'lost');
    }
    return mapProposal(rows[0]);
  },

  async listClients() {
    const { rows } = await pool.query(
      'SELECT * FROM clients WHERE archived_at IS NULL ORDER BY created_at DESC',
    );
    return rows.map(mapClient);
  },

  async listClientsIncludingArchived() {
    const { rows } = await pool.query(
      'SELECT * FROM clients ORDER BY created_at DESC',
    );
    return rows.map(mapClient);
  },

  async getClient(id) {
    const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [
      id,
    ]);
    return mapClient(rows[0]);
  },

  async archiveClient(id) {
    const { rows } = await pool.query(
      `UPDATE clients SET archived_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND archived_at IS NULL
       RETURNING *`,
      [id],
    );
    const newlyArchived = Boolean(rows[0]);
    const client = rows[0] ? mapClient(rows[0]) : await this.getClient(id);
    if (!client) return null;

    if (newlyArchived) {
      // Cancela agenda em aberto deste cliente (recebidos permanecem)
      await pool.query(
        `UPDATE finance_entries SET status = 'cancelled', updated_at = NOW()
         WHERE client_id = $1
           AND status NOT IN ('received','paid','cancelled')`,
        [id],
      );

      const { rows: proposalRows } = await pool.query(
        `UPDATE proposals SET status = 'lost', updated_at = NOW()
         WHERE client_id = $1
         RETURNING id`,
        [id],
      );
      for (const row of proposalRows) {
        if (this.applyPipelineToContract) {
          await this.applyPipelineToContract(row.id, 'lost');
        }
      }
      await pool.query(
        `UPDATE contracts SET status = 'cancelled', updated_at = NOW()
         WHERE client_id = $1
           AND status NOT IN ('cancelled','churn')`,
        [id],
      );
      // Cancela entradas ligadas a contratos do cliente (mesmo sem client_id no lançamento)
      await pool.query(
        `UPDATE finance_entries fe SET status = 'cancelled', updated_at = NOW()
         FROM contracts c
         WHERE fe.contract_id = c.id
           AND c.client_id = $1
           AND fe.status NOT IN ('received','paid','cancelled')`,
        [id],
      );
    }

    return client;
  },

  async createClient(b) {
    const { rows } = await pool.query(
      `INSERT INTO clients (
        legal_name, trade_name, document_type, document, email, phone, whatsapp,
        street, number, complement, district, city, state, zip,
        legal_rep_name, legal_rep_role, legal_rep_document, notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
      ) RETURNING *`,
      [
        b.legalName || '',
        b.tradeName || '',
        b.documentType || 'cnpj',
        b.document || '',
        b.email || '',
        b.phone || '',
        b.whatsapp || '',
        b.street || '',
        b.number || '',
        b.complement || '',
        b.district || '',
        b.city || '',
        b.state || '',
        b.zip || '',
        b.legalRepName || '',
        b.legalRepRole || '',
        b.legalRepDocument || '',
        b.notes || '',
      ],
    );
    return mapClient(rows[0]);
  },

  async updateClient(id, b) {
    const { rows } = await pool.query(
      `UPDATE clients SET
        legal_name = COALESCE($1, legal_name),
        trade_name = COALESCE($2, trade_name),
        document_type = COALESCE($3, document_type),
        document = COALESCE($4, document),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        whatsapp = COALESCE($7, whatsapp),
        street = COALESCE($8, street),
        number = COALESCE($9, number),
        complement = COALESCE($10, complement),
        district = COALESCE($11, district),
        city = COALESCE($12, city),
        state = COALESCE($13, state),
        zip = COALESCE($14, zip),
        legal_rep_name = COALESCE($15, legal_rep_name),
        legal_rep_role = COALESCE($16, legal_rep_role),
        legal_rep_document = COALESCE($17, legal_rep_document),
        notes = COALESCE($18, notes),
        asaas_customer_id = COALESCE($19, asaas_customer_id),
        updated_at = NOW()
       WHERE id = $20 RETURNING *`,
      [
        b.legalName,
        b.tradeName,
        b.documentType,
        b.document,
        b.email,
        b.phone,
        b.whatsapp,
        b.street,
        b.number,
        b.complement,
        b.district,
        b.city,
        b.state,
        b.zip,
        b.legalRepName,
        b.legalRepRole,
        b.legalRepDocument,
        b.notes,
        b.asaasCustomerId,
        id,
      ],
    );
    return mapClient(rows[0]);
  },

  async listContracts() {
    const { rows } = await pool.query(
      `SELECT c.* FROM contracts c
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE c.client_id IS NULL OR cl.archived_at IS NULL
       ORDER BY c.created_at DESC`,
    );
    return rows.map(mapContract);
  },

  async listContractsIncludingArchived() {
    const { rows } = await pool.query(
      'SELECT * FROM contracts ORDER BY created_at DESC',
    );
    return rows.map(mapContract);
  },

  async getContract(id) {
    const { rows } = await pool.query('SELECT * FROM contracts WHERE id = $1', [
      id,
    ]);
    return mapContract(rows[0]);
  },

  async getContractBySlug(slug) {
    const { rows } = await pool.query(
      'SELECT * FROM contracts WHERE public_slug = $1',
      [slug],
    );
    return mapContract(rows[0]);
  },

  async getContractByProposal(proposalId) {
    const { rows } = await pool.query(
      'SELECT * FROM contracts WHERE proposal_id = $1 ORDER BY created_at DESC LIMIT 1',
      [proposalId],
    );
    return mapContract(rows[0]);
  },

  async getContractBySigningToken(token) {
    if (!token) return null;
    const { rows } = await pool.query(
      'SELECT * FROM contracts WHERE signing_token = $1',
      [token],
    );
    return mapContract(rows[0]);
  },

  async prepareContractForSend(id, { token, expiresAt }) {
    const { rows } = await pool.query(
      `UPDATE contracts SET
        signing_token = $1,
        signing_token_expires_at = $2,
        status = 'sent',
        updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [token, expiresAt.toISOString(), id],
    );
    return mapContract(rows[0]);
  },

  async applyContractSignature(id, data) {
    const { rows } = await pool.query(
      `UPDATE contracts SET
        status = 'signed',
        signed_at = $1,
        signer_name = $2,
        signer_email = $3,
        signer_document = $4,
        signer_ip = $5,
        signer_user_agent = $6,
        content_hash = $7,
        signed_pdf_path = $8,
        acceptance_client_name = COALESCE(NULLIF($2, ''), acceptance_client_name),
        signing_token = NULL,
        signing_token_expires_at = NULL,
        updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        data.signedAt,
        data.signerName || '',
        data.signerEmail || '',
        data.signerDocument || '',
        data.signerIp || '',
        data.signerUserAgent || '',
        data.contentHash || '',
        data.signedPdfPath || '',
        id,
      ],
    );
    return mapContract(rows[0]);
  },

  async addSignatureEvent(contractId, eventType, meta = {}) {
    const { rows } = await pool.query(
      `INSERT INTO contract_signature_events (contract_id, event_type, meta)
       VALUES ($1, $2, $3)
       RETURNING id, contract_id, event_type, meta, created_at`,
      [contractId, eventType, JSON.stringify(meta)],
    );
    const row = rows[0];
    return {
      id: row.id,
      contractId: row.contract_id,
      eventType: row.event_type,
      meta: row.meta || {},
      createdAt: row.created_at,
    };
  },

  async listSignatureEvents(contractId) {
    const { rows } = await pool.query(
      `SELECT id, contract_id, event_type, meta, created_at
       FROM contract_signature_events
       WHERE contract_id = $1
       ORDER BY created_at DESC`,
      [contractId],
    );
    return rows.map((row) => ({
      id: row.id,
      contractId: row.contract_id,
      eventType: row.event_type,
      meta: row.meta || {},
      createdAt: row.created_at,
    }));
  },

  async createContract(b) {
    const number = await nextContractNumber();
    const publicSlug = slugId();
    const { rows } = await pool.query(
      `INSERT INTO contracts (
        number, public_slug, proposal_id, client_id, status, title, subtitle,
        start_date, min_term_days, meeting_cadence_days, objective,
        scope_items, provider_responsibilities, client_responsibilities, out_of_scope, meeting_topics, important_notes,
        setup_enabled, setup_title, setup_price, setup_description,
        fee_enabled, fee_title, fee_price, fee_description,
        commission_enabled, commission_base_label, commission_tiers, commission_close_day, commission_pay_day, commission_examples,
        media_enabled, media_monthly_budget, media_notes,
        acceptance_provider_name, acceptance_client_name
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,
        $12,$13,$14,$15,$16,$17,
        $18,$19,$20,$21,
        $22,$23,$24,$25,
        $26,$27,$28,$29,$30,$31,
        $32,$33,$34,
        $35,$36
      ) RETURNING *`,
      [
        number,
        publicSlug,
        b.proposalId || null,
        b.clientId || null,
        b.status || 'draft',
        b.title || 'Proposta comercial e contrato de prestação de serviços',
        b.subtitle || '',
        b.startDate || '',
        b.minTermDays ?? 90,
        b.meetingCadenceDays ?? 15,
        b.objective || '',
        JSON.stringify(b.scopeItems || []),
        JSON.stringify(b.providerResponsibilities || []),
        JSON.stringify(b.clientResponsibilities || []),
        JSON.stringify(b.outOfScope || []),
        JSON.stringify(b.meetingTopics || []),
        JSON.stringify(b.importantNotes || []),
        b.setupEnabled ?? false,
        b.setupTitle || 'Investimento de setup',
        b.setupPrice ?? 0,
        b.setupDescription || '',
        b.feeEnabled ?? false,
        b.feeTitle || 'Fee mensal',
        b.feePrice ?? 0,
        b.feeDescription || '',
        b.commissionEnabled ?? false,
        b.commissionBaseLabel || 'faturamento bruto mensal',
        JSON.stringify(b.commissionTiers || []),
        b.commissionCloseDay ?? 5,
        b.commissionPayDay ?? 6,
        JSON.stringify(b.commissionExamples || []),
        b.mediaEnabled ?? false,
        b.mediaMonthlyBudget ?? 0,
        b.mediaNotes || '',
        b.acceptanceProviderName || '',
        b.acceptanceClientName || '',
      ],
    );
    const created = mapContract(rows[0]);
    if (
      b.feePayDay != null ||
      b.setupDueDays != null ||
      b.setupDueDate != null ||
      b.feeFirstDueDate != null ||
      b.asaasBillingType != null ||
      b.commissionEstimate != null
    ) {
      return this.updateContract(created.id, {
        feePayDay: b.feePayDay,
        setupDueDays: b.setupDueDays,
        commissionEstimate: b.commissionEstimate,
        setupDueDate: b.setupDueDate,
        feeFirstDueDate: b.feeFirstDueDate,
        asaasBillingType: b.asaasBillingType,
      });
    }
    return created;
  },

  async updateContract(id, b) {
    const { rows } = await pool.query(
      `UPDATE contracts SET
        client_id = COALESCE($1, client_id),
        status = COALESCE($2, status),
        title = COALESCE($3, title),
        subtitle = COALESCE($4, subtitle),
        start_date = COALESCE($5, start_date),
        min_term_days = COALESCE($6, min_term_days),
        meeting_cadence_days = COALESCE($7, meeting_cadence_days),
        objective = COALESCE($8, objective),
        scope_items = COALESCE($9, scope_items),
        provider_responsibilities = COALESCE($10, provider_responsibilities),
        client_responsibilities = COALESCE($11, client_responsibilities),
        out_of_scope = COALESCE($12, out_of_scope),
        meeting_topics = COALESCE($13, meeting_topics),
        important_notes = COALESCE($14, important_notes),
        setup_enabled = COALESCE($15, setup_enabled),
        setup_title = COALESCE($16, setup_title),
        setup_price = COALESCE($17, setup_price),
        setup_description = COALESCE($18, setup_description),
        fee_enabled = COALESCE($19, fee_enabled),
        fee_title = COALESCE($20, fee_title),
        fee_price = COALESCE($21, fee_price),
        fee_description = COALESCE($22, fee_description),
        commission_enabled = COALESCE($23, commission_enabled),
        commission_base_label = COALESCE($24, commission_base_label),
        commission_tiers = COALESCE($25, commission_tiers),
        commission_close_day = COALESCE($26, commission_close_day),
        commission_pay_day = COALESCE($27, commission_pay_day),
        commission_examples = COALESCE($28, commission_examples),
        media_enabled = COALESCE($29, media_enabled),
        media_monthly_budget = COALESCE($30, media_monthly_budget),
        media_notes = COALESCE($31, media_notes),
        acceptance_provider_name = COALESCE($32, acceptance_provider_name),
        acceptance_client_name = COALESCE($33, acceptance_client_name),
        fee_pay_day = COALESCE($34, fee_pay_day),
        setup_due_days = COALESCE($35, setup_due_days),
        commission_estimate = COALESCE($36, commission_estimate),
        setup_due_date = COALESCE($37, setup_due_date),
        fee_first_due_date = COALESCE($38, fee_first_due_date),
        asaas_billing_type = COALESCE($39, asaas_billing_type),
        asaas_subscription_id = COALESCE($40, asaas_subscription_id),
        asaas_setup_payment_id = COALESCE($41, asaas_setup_payment_id),
        asaas_synced_at = COALESCE($42, asaas_synced_at),
        updated_at = NOW()
       WHERE id = $43 RETURNING *`,
      [
        b.clientId ?? null,
        b.status,
        b.title,
        b.subtitle,
        b.startDate,
        b.minTermDays,
        b.meetingCadenceDays,
        b.objective,
        b.scopeItems != null ? JSON.stringify(b.scopeItems) : null,
        b.providerResponsibilities != null
          ? JSON.stringify(b.providerResponsibilities)
          : null,
        b.clientResponsibilities != null
          ? JSON.stringify(b.clientResponsibilities)
          : null,
        b.outOfScope != null ? JSON.stringify(b.outOfScope) : null,
        b.meetingTopics != null ? JSON.stringify(b.meetingTopics) : null,
        b.importantNotes != null ? JSON.stringify(b.importantNotes) : null,
        b.setupEnabled,
        b.setupTitle,
        b.setupPrice,
        b.setupDescription,
        b.feeEnabled,
        b.feeTitle,
        b.feePrice,
        b.feeDescription,
        b.commissionEnabled,
        b.commissionBaseLabel,
        b.commissionTiers != null ? JSON.stringify(b.commissionTiers) : null,
        b.commissionCloseDay,
        b.commissionPayDay,
        b.commissionExamples != null
          ? JSON.stringify(b.commissionExamples)
          : null,
        b.mediaEnabled,
        b.mediaMonthlyBudget,
        b.mediaNotes,
        b.acceptanceProviderName,
        b.acceptanceClientName,
        b.feePayDay,
        b.setupDueDays,
        b.commissionEstimate,
        b.setupDueDate,
        b.feeFirstDueDate,
        b.asaasBillingType,
        b.asaasSubscriptionId,
        b.asaasSetupPaymentId,
        b.asaasSyncedAt,
        id,
      ],
    );
    return mapContract(rows[0]);
  },

  async listFinanceCategories() {
    const { rows } = await pool.query(
      'SELECT * FROM finance_categories ORDER BY kind, name',
    );
    if (!rows.length) {
      for (const cat of DEFAULT_FINANCE_CATEGORIES) {
        await pool.query(
          `INSERT INTO finance_categories (name, kind, system) VALUES ($1,$2,$3)`,
          [cat.name, cat.kind, cat.system],
        );
      }
      const again = await pool.query(
        'SELECT * FROM finance_categories ORDER BY kind, name',
      );
      return again.rows.map(mapFinanceCategory);
    }
    return rows.map(mapFinanceCategory);
  },

  async createFinanceCategory({ name, kind }) {
    const { rows } = await pool.query(
      `INSERT INTO finance_categories (name, kind, system) VALUES ($1,$2,false) RETURNING *`,
      [name.trim(), kind],
    );
    return mapFinanceCategory(rows[0]);
  },

  async reconcileClosedFinance() {
    await pool.query(
      `UPDATE finance_entries fe SET status = 'cancelled', updated_at = NOW()
       FROM clients c
       WHERE fe.client_id = c.id
         AND c.archived_at IS NOT NULL
         AND fe.status NOT IN ('received','paid','cancelled')`,
    );
    await pool.query(
      `UPDATE finance_entries fe SET status = 'cancelled', updated_at = NOW()
       FROM contracts c
       WHERE fe.contract_id = c.id
         AND c.status IN ('cancelled','churn')
         AND fe.status NOT IN ('received','paid','cancelled')`,
    );
  },

  async listFinanceEntries(filters = {}) {
    if (!filters.includeClosed) {
      await this.reconcileClosedFinance();
    }
    const { rows } = await pool.query(
      'SELECT * FROM finance_entries ORDER BY due_date ASC',
    );
    let entries = rows.map(mapFinanceEntry);

    const [allClients, allContracts] = await Promise.all([
      this.listClientsIncludingArchived(),
      this.listContractsIncludingArchived(),
    ]);
    const clientsById = Object.fromEntries(allClients.map((c) => [c.id, c]));

    // Por padrão some agenda de clientes arquivados e contratos churn/cancelados
    if (!filters.includeClosed) {
      const archivedClientIds = new Set(
        allClients.filter((c) => c.archivedAt).map((c) => c.id),
      );
      const closedContractIds = new Set(
        allContracts
          .filter((c) => ['cancelled', 'churn'].includes(c.status))
          .map((c) => c.id),
      );
      entries = entries.filter((e) => {
        if (e.clientId && archivedClientIds.has(e.clientId)) return false;
        if (e.contractId && closedContractIds.has(e.contractId)) return false;
        return true;
      });
    }

    if (filters.type) entries = entries.filter((e) => e.type === filters.type);
    if (filters.clientId) {
      entries = entries.filter((e) => e.clientId === filters.clientId);
    }
    if (filters.contractId) {
      entries = entries.filter((e) => e.contractId === filters.contractId);
    }
    if (filters.status) {
      entries = entries.filter((e) => e.status === filters.status);
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

    return entries.map((e) => {
      const c = e.clientId ? clientsById[e.clientId] : null;
      const clientName = c ? c.tradeName || c.legalName || '' : '';
      return { ...e, clientName };
    });
  },

  async createFinanceEntry(input) {
    const { rows } = await pool.query(
      `INSERT INTO finance_entries (
        type, origin, status, amount, due_date, paid_at, description,
        category_id, client_id, contract_id, proposal_id, recurrence_group_id, notes,
        asaas_payment_id, invoice_url, billing_type
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        input.type || 'expense',
        input.origin || 'manual',
        input.status || 'scheduled',
        input.amount ?? 0,
        input.dueDate || '',
        input.paidAt || null,
        input.description || '',
        input.categoryId || null,
        input.clientId || null,
        input.contractId || null,
        input.proposalId || null,
        input.recurrenceGroupId || null,
        input.notes || '',
        input.asaasPaymentId || '',
        input.invoiceUrl || '',
        input.billingType || '',
      ],
    );
    return mapFinanceEntry(rows[0]);
  },

  async getFinanceEntry(id) {
    const { rows } = await pool.query(
      'SELECT * FROM finance_entries WHERE id = $1',
      [id],
    );
    return mapFinanceEntry(rows[0]);
  },

  async getFinanceEntryByAsaasPaymentId(asaasPaymentId) {
    if (!asaasPaymentId) return null;
    const { rows } = await pool.query(
      'SELECT * FROM finance_entries WHERE asaas_payment_id = $1 LIMIT 1',
      [asaasPaymentId],
    );
    return mapFinanceEntry(rows[0]);
  },

  async updateFinanceEntry(id, patch) {
    const current = (
      await pool.query('SELECT * FROM finance_entries WHERE id = $1', [id])
    ).rows[0];
    if (!current) return null;
    const merged = {
      ...mapFinanceEntry(current),
      ...Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined),
      ),
    };
    const { rows } = await pool.query(
      `UPDATE finance_entries SET
        type = $1, origin = $2, status = $3, amount = $4, due_date = $5,
        paid_at = $6, description = $7, category_id = $8, client_id = $9,
        contract_id = $10, proposal_id = $11, recurrence_group_id = $12,
        notes = $13, asaas_payment_id = $14, invoice_url = $15, billing_type = $16,
        updated_at = NOW()
       WHERE id = $17 RETURNING *`,
      [
        merged.type,
        merged.origin,
        patch.status != null ? patch.status : current.status,
        merged.amount,
        merged.dueDate,
        merged.paidAt,
        merged.description,
        merged.categoryId,
        merged.clientId,
        merged.contractId,
        merged.proposalId,
        merged.recurrenceGroupId,
        merged.notes,
        merged.asaasPaymentId || '',
        merged.invoiceUrl || '',
        merged.billingType || '',
        id,
      ],
    );
    return mapFinanceEntry(rows[0]);
  },

  async syncContractFinance(contractId) {
    const contract = await this.getContract(contractId);
    if (!contract) return null;
    const cats = await this.listFinanceCategories();
    const byKey = {};
    for (const c of cats) {
      const match = DEFAULT_FINANCE_CATEGORIES.find((d) => d.name === c.name);
      if (match) byKey[match.key] = c.id;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = toISODate(today);

    await pool.query(
      `UPDATE finance_entries SET status = 'cancelled', updated_at = NOW()
       WHERE contract_id = $1
         AND origin IN ('contract_setup','contract_fee')
         AND status NOT IN ('received','paid')
         AND COALESCE(asaas_payment_id, '') = ''
         AND due_date IS NOT NULL`,
      [contractId],
    );

    const scheduleClient =
      (contract.clientId && (await this.getClient(contract.clientId))) || null;
    const clientName =
      scheduleClient?.tradeName || scheduleClient?.legalName || '';
    const schedule = buildContractSchedule(contract, byKey, 12, clientName);
    const existing = await this.listFinanceEntries({
      contractId,
      includeClosed: true,
    });
    for (const item of schedule) {
      const dueIso = toISODate(parseBRDate(item.dueDate));
      if (dueIso && dueIso < todayIso && item.origin !== 'contract_setup') continue;
      const already = existing.some(
        (e) =>
          e.origin === item.origin &&
          e.status !== 'cancelled' &&
          (e.asaasPaymentId ||
            toISODate(parseBRDate(e.dueDate)) === dueIso),
      );
      if (already) continue;
      await this.createFinanceEntry(item);
    }
    return this.listFinanceEntries({ contractId });
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
    const days = Object.values(byDay).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    let balance = 0;
    return days.map((d) => {
      balance += d.income - d.expense;
      return { ...d, balance };
    });
  },

  async listComercial() {
    const proposals = await this.listProposals();
    const clients = Object.fromEntries(
      (await this.listClientsIncludingArchived()).map((c) => [c.id, c]),
    );
    const contracts = await this.listContractsIncludingArchived();
    const contractsByProposal = {};
    for (const c of contracts) {
      if (!c.proposalId) continue;
      const prev = contractsByProposal[c.proposalId];
      if (!prev || new Date(c.createdAt) > new Date(prev.createdAt)) {
        contractsByProposal[c.proposalId] = c;
      }
    }
    const allEntries = await this.listFinanceEntries({});
    const today = new Date();
    return proposals
      .filter((proposal) => proposal.status !== 'archived')
      .map((proposal) => {
        const contract = contractsByProposal[proposal.id] || null;
        const linkedClientId = proposal.clientId || contract?.clientId || null;
        const linkedClient = linkedClientId ? clients[linkedClientId] : null;
        // Cliente arquivado: some do comercial por completo
        if (linkedClient?.archivedAt) return null;

        const client =
          linkedClient && !linkedClient.archivedAt ? linkedClient : null;
        let stage = resolveLegacyStage(proposal, contract);
        const pipelineStatus = resolvePipelineStatus(proposal, contract);

        const contractEntries = contract
          ? allEntries.filter((e) => e.contractId === contract.id)
          : [];

        const nextReceivables = contractEntries
          .filter(
            (e) =>
              e.type === 'income' &&
              !['cancelled', 'received', 'paid'].includes(e.status),
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
  },

  async listFunnelProjects({ clientId } = {}) {
    const params = [];
    const where = [];
    if (clientId) {
      params.push(clientId);
      where.push(`client_id = $${params.length}`);
    }
    const { rows } = await pool.query(
      `SELECT * FROM funnel_projects
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY updated_at DESC, created_at DESC`,
      params,
    );
    return rows.map(mapFunnelProject);
  },

  async getFunnelProject(id) {
    const { rows } = await pool.query(
      'SELECT * FROM funnel_projects WHERE id = $1',
      [id],
    );
    return mapFunnelProject(rows[0]);
  },

  async createFunnelProject(input) {
    const graph = input.graph || { nodes: [], edges: [] };
    const { rows } = await pool.query(
      `INSERT INTO funnel_projects (client_id, proposal_id, name, graph_json)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING *`,
      [
        input.clientId,
        input.proposalId || null,
        String(input.name || 'Funil de aquisição').trim(),
        JSON.stringify(graph),
      ],
    );
    return mapFunnelProject(rows[0]);
  },

  async updateFunnelProject(id, input) {
    const graphJson =
      input.graph != null ? JSON.stringify(input.graph) : null;
    const { rows } = await pool.query(
      `UPDATE funnel_projects SET
        client_id = COALESCE($1, client_id),
        proposal_id = COALESCE($2, proposal_id),
        name = COALESCE($3, name),
        graph_json = COALESCE($4::jsonb, graph_json),
        updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        input.clientId ?? null,
        input.proposalId ?? null,
        input.name != null ? String(input.name).trim() || null : null,
        graphJson,
        id,
      ],
    );
    return mapFunnelProject(rows[0]);
  },

  async deleteFunnelProject(id) {
    const { rowCount } = await pool.query(
      'DELETE FROM funnel_projects WHERE id = $1',
      [id],
    );
    return rowCount > 0;
  },

  /** Cancela recebíveis em aberto do contrato (churn/perdido/arquivado) */
  async cancelFutureContractEntries(contractId) {
    const { rowCount } = await pool.query(
      `UPDATE finance_entries SET status = 'cancelled', updated_at = NOW()
       WHERE contract_id = $1
         AND origin IN ('contract_setup','contract_fee','contract_commission')
         AND status NOT IN ('received','paid','cancelled')`,
      [contractId],
    );
    return rowCount;
  },

  /**
   * Mantém o contrato coerente com o pipeline comercial:
   * churn/perdido encerram a agenda, ativo regenera os recebíveis.
   */
  async applyPipelineToContract(proposalId, pipeline) {
    const nextStatus = contractStatusFromPipeline(pipeline);
    if (!nextStatus) return null;

    const contracts = (await this.listContractsIncludingArchived()).filter(
      (c) => c.proposalId === proposalId,
    );
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
      const scheduled = (
        await this.listFinanceEntries({
          contractId: contract.id,
          includeClosed: true,
        })
      ).filter(
        (e) =>
          ['contract_setup', 'contract_fee', 'contract_commission'].includes(
            e.origin,
          ) && e.status !== 'cancelled',
      );
      if (scheduled.length === 0) {
        await this.syncContractFinance(contract.id);
      }
    }

    return this.getContract(contract.id);
  },
};

let store = fileStore;

export async function initStore() {
  if (process.env.STORE === 'file') {
    store = fileStore;
    console.log('Store: arquivo JSON (api/data/db.json)');
    return store;
  }
  try {
    await pool.query('SELECT 1');
    store = pgStore;
    console.log('Store: PostgreSQL');
  } catch (err) {
    console.warn(
      'Postgres indisponível, usando arquivo JSON local:',
      err.message,
    );
    store = fileStore;
  }
  return store;
}

export function getStore() {
  return store;
}
