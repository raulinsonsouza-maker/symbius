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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS proposals_created_at_idx ON proposals (created_at DESC);
CREATE INDEX IF NOT EXISTS services_block_sort_idx ON services (block, sort_order);
