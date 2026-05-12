-- Up Migration
-- Migration: 20260512020100000_create-refresh-sessions
-- Why:
-- - persistir refresh tokens opacos de admins
-- - permitir revocacion, expiracion y auditoria basica de sesiones

CREATE TABLE refresh_sessions (
  id UUID PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_refresh_sessions_token_hash
ON refresh_sessions(token_hash);

CREATE INDEX idx_refresh_sessions_admin_id
ON refresh_sessions(admin_id);

CREATE INDEX idx_refresh_sessions_expires_at
ON refresh_sessions(expires_at);

-- Down Migration
-- Migration: 20260512020100000_create-refresh-sessions

DROP TABLE IF EXISTS refresh_sessions;
