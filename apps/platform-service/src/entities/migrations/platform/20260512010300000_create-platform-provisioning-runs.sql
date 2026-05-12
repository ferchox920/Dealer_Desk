-- Up Migration
-- Migration: 20260512010300000_create-platform-provisioning-runs
-- Why:
-- - conservar historial operativo de provisioning dentro de platform-service

CREATE TABLE platform_system_provisioning_runs (
  id UUID PRIMARY KEY,
  system_id UUID NOT NULL REFERENCES platform_systems(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL
    CHECK (status IN ('pending', 'running', 'failed', 'completed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  catalog_base_url TEXT,
  identity_base_url TEXT,
  database_name VARCHAR(255),
  owner_email VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_system_provisioning_runs_system_id
ON platform_system_provisioning_runs(system_id);

CREATE INDEX idx_platform_system_provisioning_runs_status
ON platform_system_provisioning_runs(status);

-- Down Migration
-- Migration: 20260512010300000_create-platform-provisioning-runs

DROP TABLE IF EXISTS platform_system_provisioning_runs;
