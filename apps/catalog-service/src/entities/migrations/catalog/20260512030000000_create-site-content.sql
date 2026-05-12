-- Up Migration
-- Migration: 20260512030000000_create-site-content
-- Why:
-- - almacenar el contenido editable de la web publica del dealer

CREATE TABLE site_content (
  id UUID PRIMARY KEY,
  hero_config JSONB NOT NULL,
  about_body TEXT NOT NULL,
  about_body_i18n JSONB NOT NULL,
  services JSONB NOT NULL,
  footer_summary TEXT NOT NULL,
  footer_summary_i18n JSONB NOT NULL,
  hours JSONB NOT NULL,
  social_links JSONB NOT NULL,
  whatsapp_config JSONB NOT NULL,
  location_config JSONB NOT NULL,
  default_public_language VARCHAR(10) NOT NULL DEFAULT 'en',
  sections_config JSONB NOT NULL,
  logo_path TEXT,
  logo_mime_type VARCHAR(50),
  logo_original_name VARCHAR(255),
  logo_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT site_content_default_public_language_check
    CHECK (default_public_language IN ('en', 'es'))
);

-- Down Migration
-- Migration: 20260512030000000_create-site-content

DROP TABLE IF EXISTS site_content;
