CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- companies
CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  country         TEXT NOT NULL,
  sector          TEXT NOT NULL,
  website         TEXT,
  logo_url        TEXT,
  stellar_address TEXT,
  is_certified    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_stellar  ON companies(stellar_address);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_select_own ON companies;
DROP POLICY IF EXISTS company_insert_own ON companies;
DROP POLICY IF EXISTS company_update_own ON companies;

CREATE POLICY company_select_own ON companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY company_insert_own ON companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY company_update_own ON companies FOR UPDATE USING (auth.uid() = user_id);

-- products
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  materials       TEXT[],
  origin_city     TEXT,
  origin_country  TEXT NOT NULL,
  category        TEXT NOT NULL,
  year            INTEGER,
  certifications  JSONB DEFAULT '[]',
  images          TEXT[],
  metadata_hash   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_country    ON products(origin_country);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_select_own    ON products;
DROP POLICY IF EXISTS products_select_public ON products;
DROP POLICY IF EXISTS products_insert_own    ON products;
DROP POLICY IF EXISTS products_update_own    ON products;

CREATE POLICY products_select_own ON products FOR SELECT USING (
  company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);
CREATE POLICY products_select_public ON products FOR SELECT USING (metadata_hash IS NOT NULL);
CREATE POLICY products_insert_own ON products FOR INSERT WITH CHECK (
  company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);
CREATE POLICY products_update_own ON products FOR UPDATE USING (
  company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

-- passports
CREATE TABLE IF NOT EXISTS passports (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  passport_id      TEXT NOT NULL UNIQUE,
  metadata_hash    TEXT NOT NULL,
  issuer_address   TEXT NOT NULL,
  owner_address    TEXT NOT NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  issued_at_ledger INTEGER,
  qr_url           TEXT,
  tx_hash          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passports_passport_id ON passports(passport_id);
CREATE INDEX IF NOT EXISTS idx_passports_product_id  ON passports(product_id);
CREATE INDEX IF NOT EXISTS idx_passports_owner       ON passports(owner_address);
CREATE INDEX IF NOT EXISTS idx_passports_issuer      ON passports(issuer_address);
CREATE INDEX IF NOT EXISTS idx_passports_metadata    ON passports(metadata_hash);
ALTER TABLE passports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS passports_select_public ON passports;
DROP POLICY IF EXISTS passports_insert_own    ON passports;
DROP POLICY IF EXISTS passports_update_own    ON passports;

CREATE POLICY passports_select_public ON passports FOR SELECT USING (TRUE);
CREATE POLICY passports_insert_own ON passports FOR INSERT WITH CHECK (
  company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);
CREATE POLICY passports_update_own ON passports FOR UPDATE USING (
  company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

-- traceability_events
CREATE TABLE IF NOT EXISTS traceability_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passport_id  TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  from_address TEXT,
  to_address   TEXT,
  metadata     JSONB DEFAULT '{}',
  ledger       INTEGER,
  tx_hash      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_passport_id ON traceability_events(passport_id);
CREATE INDEX IF NOT EXISTS idx_events_type        ON traceability_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created     ON traceability_events(created_at DESC);
ALTER TABLE traceability_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select_public  ON traceability_events;
DROP POLICY IF EXISTS events_insert_service ON traceability_events;

CREATE POLICY events_select_public  ON traceability_events FOR SELECT USING (TRUE);
CREATE POLICY events_insert_service ON traceability_events FOR INSERT WITH CHECK (TRUE);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_updated_at ON companies;
DROP TRIGGER IF EXISTS products_updated_at  ON products;
DROP TRIGGER IF EXISTS passports_updated_at ON passports;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at  BEFORE UPDATE ON products  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER passports_updated_at BEFORE UPDATE ON passports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- storage policies
DROP POLICY IF EXISTS "public_read_product_images"   ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_product_images"   ON storage.objects;
DROP POLICY IF EXISTS "auth_update_product_images"   ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_product_images"   ON storage.objects;
DROP POLICY IF EXISTS "public_read_certifications"   ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_certifications"   ON storage.objects;
DROP POLICY IF EXISTS "auth_read_certifications"     ON storage.objects;

CREATE POLICY "public_read_product_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "auth_upload_product_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "auth_update_product_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "auth_delete_product_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "auth_read_certifications" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'certifications');

CREATE POLICY "auth_upload_certifications" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certifications');
