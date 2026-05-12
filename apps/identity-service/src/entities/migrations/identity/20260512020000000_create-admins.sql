-- Up Migration
-- Migration: 20260512020000000_create-admins
-- Why:
-- - crear la tabla base de usuarios del panel admin
-- - mantener roles owner/staff controlados desde la DB

CREATE TABLE admins (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admins_role_check CHECK (role IN ('owner', 'staff'))
);

-- Down Migration
-- Migration: 20260512020000000_create-admins

DROP TABLE IF EXISTS admins;
