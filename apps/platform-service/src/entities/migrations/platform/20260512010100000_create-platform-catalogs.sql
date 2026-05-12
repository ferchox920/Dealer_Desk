-- Up Migration
-- Migration: 20260512010100000_create-platform-catalogs
-- Why:
-- - crear catalogos base de la plataforma para locaciones, monedas, planes y addons

CREATE TABLE platform_locations (
  id UUID PRIMARY KEY,
  country_code VARCHAR(10) NOT NULL,
  country_name VARCHAR(120) NOT NULL,
  region VARCHAR(120),
  city VARCHAR(120),
  timezone VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_platform_locations_unique_scope
ON platform_locations(country_code, COALESCE(region, ''), COALESCE(city, ''), timezone);

CREATE TABLE platform_currencies (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_product_currency BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_plans (
  code VARCHAR(80) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_plan_prices (
  id UUID PRIMARY KEY,
  plan_code VARCHAR(80) NOT NULL REFERENCES platform_plans(code) ON DELETE CASCADE,
  currency_code VARCHAR(10) NOT NULL REFERENCES platform_currencies(code) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  billing_period VARCHAR(30) NOT NULL DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly', 'one_time')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_code, currency_code, billing_period)
);

CREATE TABLE platform_plan_entitlements (
  plan_code VARCHAR(80) PRIMARY KEY REFERENCES platform_plans(code) ON DELETE CASCADE,
  publication_limit INTEGER NOT NULL CHECK (publication_limit >= 0),
  user_limit INTEGER NOT NULL CHECK (user_limit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_addons (
  code VARCHAR(80) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  addon_type VARCHAR(40) NOT NULL CHECK (addon_type IN ('publication_pack', 'user_pack', 'setup')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  price_currency_code VARCHAR(10) NOT NULL REFERENCES platform_currencies(code) ON DELETE RESTRICT,
  price_amount NUMERIC(12, 2) NOT NULL CHECK (price_amount >= 0),
  billing_period VARCHAR(30) NOT NULL DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly', 'one_time')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Down Migration
-- Migration: 20260512010100000_create-platform-catalogs

DROP TABLE IF EXISTS platform_addons;
DROP TABLE IF EXISTS platform_plan_entitlements;
DROP TABLE IF EXISTS platform_plan_prices;
DROP TABLE IF EXISTS platform_plans;
DROP TABLE IF EXISTS platform_currencies;
DROP TABLE IF EXISTS platform_locations;
