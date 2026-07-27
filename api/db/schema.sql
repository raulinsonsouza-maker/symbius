CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'Symbius',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  contact_website TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '/images/logotipo-branco.png',
  default_responsible TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT NOT NULL DEFAULT '5511999999999',
  legal_name TEXT NOT NULL DEFAULT '',
  legal_document TEXT NOT NULL DEFAULT '',
  legal_address TEXT NOT NULL DEFAULT '',
  legal_rep_name TEXT NOT NULL DEFAULT '',
  legal_rep_role TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS legal_name TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS legal_document TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS legal_address TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS legal_rep_name TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS legal_rep_role TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  block TEXT NOT NULL CHECK (block IN ('setup', 'operacao')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  public_slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'archived')),
  template TEXT NOT NULL DEFAULT 'brandgrowth' CHECK (template IN ('blank', 'brandgrowth', 'social')),
  client_name TEXT NOT NULL DEFAULT '',
  responsible_name TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  manifesto TEXT NOT NULL DEFAULT '',
  scope_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  setup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  setup_title TEXT NOT NULL DEFAULT 'Setup',
  setup_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  setup_footer TEXT NOT NULL DEFAULT '',
  setup_service_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  operation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  operation_title TEXT NOT NULL DEFAULT 'Operação BrandGrowth',
  operation_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  operation_footer TEXT NOT NULL DEFAULT '',
  operation_service_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  traffic_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  traffic_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  traffic_footer TEXT NOT NULL DEFAULT 'Gestão de mídia (mídia à parte)',
  blank_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_status_check
  CHECK (status IN ('draft', 'sent', 'won', 'archived', 'lost', 'churn'));

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pipeline_status TEXT;

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL DEFAULT '',
  trade_name TEXT NOT NULL DEFAULT '',
  document_type TEXT NOT NULL DEFAULT 'cnpj' CHECK (document_type IN ('cnpj', 'cpf')),
  document TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  number TEXT NOT NULL DEFAULT '',
  complement TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  legal_rep_name TEXT NOT NULL DEFAULT '',
  legal_rep_role TEXT NOT NULL DEFAULT '',
  legal_rep_document TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  public_slug TEXT NOT NULL UNIQUE,
  proposal_id UUID,
  client_id UUID,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'signed', 'active', 'cancelled', 'churn')),
  title TEXT NOT NULL DEFAULT 'Proposta comercial e contrato de prestação de serviços',
  subtitle TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  min_term_days INT NOT NULL DEFAULT 90,
  meeting_cadence_days INT NOT NULL DEFAULT 15,
  objective TEXT NOT NULL DEFAULT '',
  scope_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider_responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  out_of_scope JSONB NOT NULL DEFAULT '[]'::jsonb,
  meeting_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  important_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  setup_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  setup_title TEXT NOT NULL DEFAULT 'Investimento de setup',
  setup_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  setup_description TEXT NOT NULL DEFAULT '',
  fee_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  fee_title TEXT NOT NULL DEFAULT 'Fee mensal',
  fee_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  fee_description TEXT NOT NULL DEFAULT '',
  commission_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  commission_base_label TEXT NOT NULL DEFAULT 'faturamento bruto mensal',
  commission_tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  commission_close_day INT NOT NULL DEFAULT 5,
  commission_pay_day INT NOT NULL DEFAULT 6,
  commission_examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  media_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  media_monthly_budget NUMERIC(12, 2) NOT NULL DEFAULT 0,
  media_notes TEXT NOT NULL DEFAULT '',
  acceptance_provider_name TEXT NOT NULL DEFAULT '',
  acceptance_client_name TEXT NOT NULL DEFAULT '',
  fee_pay_day INT NOT NULL DEFAULT 5,
  setup_due_days INT NOT NULL DEFAULT 0,
  commission_estimate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS subtitle TEXT NOT NULL DEFAULT '';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS meeting_topics JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS fee_pay_day INT NOT NULL DEFAULT 5;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS setup_due_days INT NOT NULL DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS commission_estimate NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_token TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_token_expires_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signer_name TEXT NOT NULL DEFAULT '';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signer_email TEXT NOT NULL DEFAULT '';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signer_document TEXT NOT NULL DEFAULT '';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signer_ip TEXT NOT NULL DEFAULT '';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signer_user_agent TEXT NOT NULL DEFAULT '';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS content_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_pdf_path TEXT NOT NULL DEFAULT '';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS setup_due_date TEXT NOT NULL DEFAULT '';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS fee_first_due_date TEXT NOT NULL DEFAULT '';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS asaas_billing_type TEXT NOT NULL DEFAULT 'UNDEFINED';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT NOT NULL DEFAULT '';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS asaas_setup_payment_id TEXT NOT NULL DEFAULT '';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS asaas_synced_at TIMESTAMPTZ;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft', 'sent', 'signed', 'active', 'cancelled', 'churn'));

CREATE UNIQUE INDEX IF NOT EXISTS contracts_signing_token_uidx
  ON contracts (signing_token)
  WHERE signing_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS contract_signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('sent', 'viewed', 'signed', 'email_failed')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contract_signature_events_contract_idx
  ON contract_signature_events (contract_id, created_at DESC);

CREATE TABLE IF NOT EXISTS finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  system BOOLEAN NOT NULL DEFAULT FALSE,
  key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  origin TEXT NOT NULL DEFAULT 'manual'
    CHECK (origin IN ('manual', 'contract_setup', 'contract_fee', 'contract_commission')),
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'received', 'paid', 'overdue', 'cancelled')),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL DEFAULT '',
  paid_at TEXT,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID,
  client_id UUID,
  contract_id UUID,
  proposal_id UUID,
  recurrence_group_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  asaas_payment_id TEXT NOT NULL DEFAULT '',
  invoice_url TEXT NOT NULL DEFAULT '',
  billing_type TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT NOT NULL DEFAULT '';
ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS invoice_url TEXT NOT NULL DEFAULT '';
ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS finance_entries_asaas_payment_idx
  ON finance_entries (asaas_payment_id)
  WHERE asaas_payment_id <> '';

CREATE INDEX IF NOT EXISTS proposals_created_at_idx ON proposals (created_at DESC);
CREATE INDEX IF NOT EXISTS services_block_sort_idx ON services (block, sort_order);
CREATE INDEX IF NOT EXISTS clients_created_at_idx ON clients (created_at DESC);
CREATE INDEX IF NOT EXISTS contracts_created_at_idx ON contracts (created_at DESC);
CREATE INDEX IF NOT EXISTS finance_entries_due_date_idx ON finance_entries (due_date);
CREATE INDEX IF NOT EXISTS finance_entries_contract_idx ON finance_entries (contract_id);
