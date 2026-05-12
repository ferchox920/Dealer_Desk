-- Up Migration
-- Migration: 20260512050000000_create-login-background
-- Why:
-- - guardar la foto activa actual del login
-- - guardar historial de imagenes usadas para evitar repeticiones y limpiar viejos registros

CREATE TABLE IF NOT EXISTS login_background (
  id UUID PRIMARY KEY,
  image_url TEXT NOT NULL,
  photographer_name VARCHAR(255),
  photo_page_url TEXT,
  provider VARCHAR(50) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_background_history (
  id UUID PRIMARY KEY,
  image_url TEXT NOT NULL,
  photographer_name VARCHAR(255),
  photo_page_url TEXT,
  provider VARCHAR(50) NOT NULL,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_background_history_selected_at
ON login_background_history(selected_at);

CREATE INDEX IF NOT EXISTS idx_login_background_history_image_url
ON login_background_history(image_url);

-- Down Migration
-- Migration: 20260512050000000_create-login-background

DROP TABLE IF EXISTS login_background_history;
DROP TABLE IF EXISTS login_background;
