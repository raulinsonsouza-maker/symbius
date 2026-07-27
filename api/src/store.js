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
      'SELECT * FROM proposals ORDER BY created_at DESC',
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

  async listClients() {
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
        updated_at = NOW()
       WHERE id = $19 RETURNING *`,
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
        id,
      ],
    );
    return mapClient(rows[0]);
  },

  async listContracts() {
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
    return mapContract(rows[0]);
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
        updated_at = NOW()
       WHERE id = $34 RETURNING *`,
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

  async listFinanceEntries(filters = {}) {
    const { rows } = await pool.query(
      'SELECT * FROM finance_entries ORDER BY due_date ASC',
    );
    let entries = rows.map(mapFinanceEntry);
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
    return entries;
  },

  async createFinanceEntry(input) {
    const { rows } = await pool.query(
      `INSERT INTO finance_entries (
        type, origin, status, amount, due_date, paid_at, description,
        category_id, client_id, contract_id, proposal_id, recurrence_group_id, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
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
      ],
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
        notes = $13, updated_at = NOW()
       WHERE id = $14 RETURNING *`,
      [
        merged.type,
        merged.origin,
        patch.status || current.status,
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
         AND origin IN ('contract_setup','contract_fee','contract_commission')
         AND status NOT IN ('received','paid')
         AND due_date IS NOT NULL`,
      [contractId],
    );

    const schedule = buildContractSchedule(contract, byKey, 12);
    for (const item of schedule) {
      const dueIso = toISODate(parseBRDate(item.dueDate));
      if (dueIso && dueIso < todayIso && item.origin !== 'contract_setup') continue;
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
      (await this.listClients()).map((c) => [c.id, c]),
    );
    const contracts = await this.listContracts();
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
    return proposals.map((proposal) => {
      const contract = contractsByProposal[proposal.id] || null;
      const client =
        (proposal.clientId && clients[proposal.clientId]) ||
        (contract?.clientId && clients[contract.clientId]) ||
        null;
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
    });
  },

  /** Cancela recebíveis futuros gerados pelo contrato (churn/perdido) */
  async cancelFutureContractEntries(contractId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { rowCount } = await pool.query(
      `UPDATE finance_entries SET status = 'cancelled', updated_at = NOW()
       WHERE contract_id = $1
         AND origin IN ('contract_setup','contract_fee','contract_commission')
         AND status NOT IN ('received','paid','cancelled')
         AND due_date >= $2`,
      [contractId, toISODate(today)],
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

    const contracts = (await this.listContracts()).filter(
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
      const scheduled = (await this.listFinanceEntries({
        contractId: contract.id,
      })).filter(
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
