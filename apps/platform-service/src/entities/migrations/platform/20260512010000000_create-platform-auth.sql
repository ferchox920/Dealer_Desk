-- Up Migration
-- Migration: 20260512010000000_create-platform-auth
-- Why:
-- - crear auth base de la plataforma central

CREATE TABLE platform_admins (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_admins_role_check
    CHECK (role IN ('super_admin'))
);

CREATE TABLE platform_refresh_sessions (
  id UUID PRIMARY KEY,
  platform_admin_id UUID NOT NULL REFERENCES platform_admins(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_refresh_sessions_admin_id
ON platform_refresh_sessions(platform_admin_id);

CREATE INDEX idx_platform_refresh_sessions_expires_at
ON platform_refresh_sessions(expires_at);

-- Down Migration
-- Migration: 20260512010000000_create-platform-auth

DROP TABLE IF EXISTS platform_refresh_sessions;
DROP TABLE IF EXISTS platform_admins;
