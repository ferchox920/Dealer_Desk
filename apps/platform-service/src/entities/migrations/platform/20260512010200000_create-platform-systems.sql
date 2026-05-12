-- Up Migration
-- Migration: 20260512010200000_create-platform-systems
-- Why:
-- - crear el modelo central de systems, sus credenciales y su suscripcion

CREATE TABLE platform_systems (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'suspended', 'archived')),
  location_id UUID NOT NULL REFERENCES platform_locations(id) ON DELETE RESTRICT,
  admin_panel_url TEXT,
  public_site_url TEXT,
  custom_domain VARCHAR(255),
  default_subdomain VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_systems_status
ON platform_systems(status);

CREATE INDEX idx_platform_systems_location_id
ON platform_systems(location_id);

CREATE TABLE platform_system_currencies (
  system_id UUID NOT NULL REFERENCES platform_systems(id) ON DELETE CASCADE,
  currency_code VARCHAR(10) NOT NULL REFERENCES platform_currencies(code) ON DELETE RESTRICT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (system_id, currency_code)
);

CREATE UNIQUE INDEX idx_platform_system_currencies_single_default
ON platform_system_currencies(system_id)
WHERE is_default = TRUE;

CREATE TABLE platform_system_tokens (
  id UUID PRIMARY KEY,
  system_id UUID NOT NULL UNIQUE REFERENCES platform_systems(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_system_tokens_last_used_at
ON platform_system_tokens(last_used_at DESC);

CREATE TABLE platform_system_database_credentials (
  id UUID PRIMARY KEY,
  system_id UUID NOT NULL UNIQUE REFERENCES platform_systems(id) ON DELETE CASCADE,
  encrypted_connection_string TEXT NOT NULL,
  connection_hash VARCHAR(255) NOT NULL UNIQUE,
  validated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_system_cloudinary_credentials (
  id UUID PRIMARY KEY,
  system_id UUID NOT NULL UNIQUE REFERENCES platform_systems(id) ON DELETE CASCADE,
  encrypted_cloud_name TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  encrypted_api_secret TEXT NOT NULL,
  credentials_hash VARCHAR(255) NOT NULL UNIQUE,
  validated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_system_events (
  id UUID PRIMARY KEY,
  system_id UUID NOT NULL REFERENCES platform_systems(id) ON DELETE CASCADE,
  event_type VARCHAR(80) NOT NULL,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_system_events_system_id
ON platform_system_events(system_id);

CREATE INDEX idx_platform_system_events_created_at
ON platform_system_events(created_at DESC);

CREATE TABLE platform_system_subscriptions (
  id UUID PRIMARY KEY,
  system_id UUID NOT NULL UNIQUE REFERENCES platform_systems(id) ON DELETE CASCADE,
  plan_code VARCHAR(80) NOT NULL REFERENCES platform_plans(code) ON DELETE RESTRICT,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  next_renewal_at TIMESTAMPTZ NOT NULL,
  grace_days INTEGER NOT NULL DEFAULT 5 CHECK (grace_days >= 0),
  last_paid_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_system_subscriptions_status_check
    CHECK (status IN ('active', 'past_due', 'expired', 'canceled'))
);

CREATE INDEX idx_platform_system_subscriptions_plan_code
ON platform_system_subscriptions(plan_code);

CREATE INDEX idx_platform_system_subscriptions_status
ON platform_system_subscriptions(status);

CREATE INDEX idx_platform_system_subscriptions_next_renewal_at
ON platform_system_subscriptions(next_renewal_at);

CREATE TABLE platform_system_subscription_addons (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES platform_system_subscriptions(id) ON DELETE CASCADE,
  addon_code VARCHAR(80) NOT NULL REFERENCES platform_addons(code) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status VARCHAR(40) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscription_id, addon_code)
);

-- Down Migration
-- Migration: 20260512010200000_create-platform-systems

DROP TABLE IF EXISTS platform_system_subscription_addons;
DROP TABLE IF EXISTS platform_system_subscriptions;
DROP TABLE IF EXISTS platform_system_events;
DROP TABLE IF EXISTS platform_system_cloudinary_credentials;
DROP TABLE IF EXISTS platform_system_database_credentials;
DROP TABLE IF EXISTS platform_system_tokens;
DROP TABLE IF EXISTS platform_system_currencies;
DROP TABLE IF EXISTS platform_systems;
