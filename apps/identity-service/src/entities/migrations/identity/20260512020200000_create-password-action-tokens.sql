-- Up Migration
-- Migration: 20260512020200000_create-password-action-tokens
-- Why:
-- - soportar invitaciones y recuperacion de password con tokens de un solo uso

CREATE TABLE password_action_tokens (
  id UUID PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('invite', 'forgot_password')),
  token_hash VARCHAR(255) NOT NULL,
  delivery_email VARCHAR(255) NOT NULL,
  requested_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_password_action_tokens_token_hash
ON password_action_tokens(token_hash);

CREATE INDEX idx_password_action_tokens_admin_id
ON password_action_tokens(admin_id);

CREATE INDEX idx_password_action_tokens_expires_at
ON password_action_tokens(expires_at);

-- Down Migration
-- Migration: 20260512020200000_create-password-action-tokens

DROP TABLE IF EXISTS password_action_tokens;
