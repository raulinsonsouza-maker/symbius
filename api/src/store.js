import { pool } from './db.js';
import { fileStore } from './fileStore.js';
import { customAlphabet } from 'nanoid';

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
        traffic_enabled, traffic_price, traffic_footer, blank_items, observations
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
        $12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,
        $22,$23,$24,$25,$26
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
        updated_at = NOW()
       WHERE id = $25 RETURNING *`,
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
        id,
      ],
    );
    return mapProposal(rows[0]);
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
