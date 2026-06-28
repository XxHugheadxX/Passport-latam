-- =============================================================================
-- Passport LATAM — Supabase Schema completo
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

-- ── Extensiones necesarias ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABLA: companies
-- Empresas/productores registrados en la plataforma
-- =============================================================================
CREATE TABLE IF NOT EXISTS companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  country       TEXT NOT NULL,              -- "BO", "CO", "PE"...
  sector        TEXT NOT NULL,              -- "textile", "coffee", "ceramic"...
  website       TEXT,
  logo_url      TEXT,
  -- Stellar
  stellar_address TEXT,                     -- wallet del issuer
  is_certified  BOOLEAN DEFAULT FALSE,      -- certificado como issuer on-chain
  -- Timestamps
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_stellar ON companies(stellar_address);

-- ── RLS (Row Level Security) ──────────────────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Empresa ve solo sus propios datos
CREATE POLICY "company_select_own" ON companies
  FOR SELECT USING (auth.uid() = user_id);

-- Empresa puede crear su perfil
CREATE POLICY "company_insert_own" ON companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Empresa puede actualizar su propio perfil
CREATE POLICY "company_update_own" ON companies
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- TABLA: products
-- Productos registrados por las empresas (datos off-chain)
-- =============================================================================
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- Datos del producto
  name          TEXT NOT NULL,
  description   TEXT,
  materials     TEXT[],                     -- ["alpaca 100%", "tinte natural"]
  origin_city   TEXT,
  origin_country TEXT NOT NULL,             -- "BO", "CO"...
  category      TEXT NOT NULL,             -- "textile", "coffee"...
  year          INTEGER,
  -- Certificaciones off-chain
  certifications JSONB DEFAULT '[]',        -- [{name, issuer, date, url}]
  -- Media
  images        TEXT[],                     -- URLs en Supabase Storage
  -- Hash para verificación on-chain
  -- Este es el SHA-256 del JSON canónico de todos los campos arriba
  metadata_hash TEXT,                       -- 64 chars hex, generado al emitir
  -- Timestamps
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_products_company_id ON products(company_id);
CREATE INDEX idx_products_category   ON products(category);
CREATE INDEX idx_products_country    ON products(origin_country);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- La empresa ve sus productos
CREATE POLICY "products_select_own" ON products
  FOR SELECT USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

-- Público puede ver productos que tienen pasaporte emitido
CREATE POLICY "products_select_public" ON products
  FOR SELECT USING (metadata_hash IS NOT NULL);

CREATE POLICY "products_insert_own" ON products
  FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

CREATE POLICY "products_update_own" ON products
  FOR UPDATE USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

-- =============================================================================
-- TABLA: passports
-- Pasaportes digitales — bridge entre on-chain y off-chain
-- =============================================================================
CREATE TABLE IF NOT EXISTS passports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Referencia off-chain
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  -- Datos on-chain (guardados aquí como cache para el frontend)
  passport_id     TEXT NOT NULL UNIQUE,     -- ID on-chain (64 chars hex)
  metadata_hash   TEXT NOT NULL,            -- hash verificable
  issuer_address  TEXT NOT NULL,            -- wallet del issuer
  owner_address   TEXT NOT NULL,            -- dueño actual
  is_active       BOOLEAN DEFAULT TRUE,
  issued_at_ledger INTEGER,                 -- ledger de emisión
  -- QR
  qr_url          TEXT,                     -- URL pública /verify/{passport_id}
  -- Transacción de emisión
  tx_hash         TEXT,                     -- hash de la tx en Stellar
  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_passports_passport_id  ON passports(passport_id);
CREATE INDEX idx_passports_product_id   ON passports(product_id);
CREATE INDEX idx_passports_owner        ON passports(owner_address);
CREATE INDEX idx_passports_issuer       ON passports(issuer_address);
CREATE INDEX idx_passports_metadata     ON passports(metadata_hash);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE passports ENABLE ROW LEVEL SECURITY;

-- Público puede leer cualquier pasaporte (necesario para /verify)
CREATE POLICY "passports_select_public" ON passports
  FOR SELECT USING (TRUE);

-- Solo la empresa emisora puede crear el registro
CREATE POLICY "passports_insert_own" ON passports
  FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

-- Solo la empresa emisora puede actualizar (para sync con on-chain)
CREATE POLICY "passports_update_own" ON passports
  FOR UPDATE USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

-- =============================================================================
-- TABLA: traceability_events
-- Historial de eventos de cada pasaporte
-- =============================================================================
CREATE TABLE IF NOT EXISTS traceability_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passport_id  TEXT NOT NULL,               -- referencia al passport_id on-chain
  event_type   TEXT NOT NULL,               -- "emitted", "transferred", "revoked", "verified"
  -- Datos del evento
  from_address TEXT,                        -- para transfers: dueño anterior
  to_address   TEXT,                        -- para transfers: nuevo dueño
  metadata     JSONB DEFAULT '{}',          -- datos adicionales del evento
  -- On-chain
  ledger       INTEGER,                     -- ledger donde ocurrió
  tx_hash      TEXT,                        -- hash de la transacción
  -- Timestamps
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_events_passport_id ON traceability_events(passport_id);
CREATE INDEX idx_events_type        ON traceability_events(event_type);
CREATE INDEX idx_events_created     ON traceability_events(created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE traceability_events ENABLE ROW LEVEL SECURITY;

-- Público puede ver el historial de eventos
CREATE POLICY "events_select_public" ON traceability_events
  FOR SELECT USING (TRUE);

-- Solo el sistema (service role) puede insertar eventos
CREATE POLICY "events_insert_service" ON traceability_events
  FOR INSERT WITH CHECK (TRUE);

-- =============================================================================
-- FUNCIÓN: update_updated_at
-- Trigger para actualizar updated_at automáticamente
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER passports_updated_at
  BEFORE UPDATE ON passports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- FUNCIÓN: compute_metadata_hash
-- Genera el SHA-256 del JSON canónico del producto
-- Usar desde el frontend para verificar que el hash off-chain coincide con on-chain
-- =============================================================================
CREATE OR REPLACE FUNCTION compute_metadata_hash(product_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  product_row products%ROWTYPE;
  canonical_json TEXT;
BEGIN
  SELECT * INTO product_row FROM products WHERE id = product_uuid;

  -- JSON canónico: campos ordenados alfabéticamente, sin espacios
  -- Este MISMO orden debe usar el frontend al calcular el hash
  canonical_json := jsonb_build_object(
    'category',       product_row.category,
    'certifications', product_row.certifications,
    'description',    product_row.description,
    'materials',      product_row.materials,
    'name',           product_row.name,
    'origin_city',    product_row.origin_city,
    'origin_country', product_row.origin_country,
    'year',           product_row.year
  )::TEXT;

  RETURN encode(digest(canonical_json, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STORAGE BUCKETS
-- Crear en: Supabase Dashboard → Storage → New Bucket
-- O ejecutar via API:
-- =============================================================================
-- Bucket: product-images (público)
--   Max file size: 5MB
--   Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Bucket: certifications (privado — solo la empresa ve sus certificados)
--   Max file size: 10MB
--   Allowed MIME types: application/pdf
-- =============================================================================

-- ── Datos de prueba ───────────────────────────────────────────────────────────
-- IMPORTANTE: Solo para desarrollo. Eliminar antes de producción.
--
-- INSERT INTO companies (user_id, name, country, sector, stellar_address) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'Alpaca Boliviana SA', 'BO', 'textile', 'GXXXXXXXXX...'),
--   ('00000000-0000-0000-0000-000000000002', 'Café Colombia Org', 'CO', 'coffee', 'GYYYYYYYYYY...');

-- =============================================================================
-- FIN DEL SCHEMA
-- Verificar con: SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- =============================================================================
