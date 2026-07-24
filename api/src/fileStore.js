import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { customAlphabet } from 'nanoid';
import { randomUUID } from 'crypto';

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
    },
    services,
    proposals: [],
  };
}

function readDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    const db = defaultDb();
    fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf8');
    return db;
  }
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
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
    return [...readDb().proposals].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
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
};
