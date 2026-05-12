-- Up Migration
-- Migration: 20260512000000000_create-catalog-core
-- Why:
-- - crear la base oficial del catalog-service
-- - llevar products al modelo avanzado de catalog sin depender de platform

CREATE SEQUENCE IF NOT EXISTS products_internal_code_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  internal_code VARCHAR(50) NOT NULL DEFAULT LPAD(nextval('products_internal_code_seq')::text, 3, '0'),
  year INTEGER NOT NULL,
  brand VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  mileage INTEGER NOT NULL,
  price INTEGER NOT NULL,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
  drive_train VARCHAR(255) NOT NULL,
  drive_train_i18n JSONB NOT NULL DEFAULT '{"en":"","es":""}'::jsonb,
  fuel_type VARCHAR(255) NOT NULL,
  fuel_type_i18n JSONB NOT NULL DEFAULT '{"en":"","es":""}'::jsonb,
  vin_number VARCHAR(255) NOT NULL,
  description TEXT,
  description_i18n JSONB NOT NULL DEFAULT '{"en":"","es":""}'::jsonb,
  publish_status VARCHAR(50) NOT NULL DEFAULT 'draft',
  sale_status VARCHAR(50) NOT NULL DEFAULT 'available',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT products_currency_code_check
    CHECK (currency_code IN ('CLP', 'USD')),
  CONSTRAINT products_publish_status_check
    CHECK (publish_status IN ('draft', 'published')),
  CONSTRAINT products_sale_status_check
    CHECK (sale_status IN ('available', 'sold', 'unavailable')),
  CONSTRAINT products_year_range_check
    CHECK (year BETWEEN 1886 AND ((date_part('year', CURRENT_DATE))::integer + 1)),
  CONSTRAINT products_mileage_range_check
    CHECK (mileage BETWEEN 0 AND 2000000),
  CONSTRAINT products_price_by_currency_check
    CHECK (
      (currency_code = 'USD' AND price BETWEEN 500 AND 100000)
      OR
      (currency_code = 'CLP' AND price BETWEEN 500000 AND 100000000)
    ),
  CONSTRAINT products_vin_number_length_check
    CHECK (char_length(vin_number) <= 17),
  CONSTRAINT products_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 500)
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS internal_code VARCHAR(50);

ALTER TABLE products
  ALTER COLUMN internal_code SET DEFAULT LPAD(nextval('products_internal_code_seq')::text, 3, '0');

UPDATE products
SET internal_code = LPAD(nextval('products_internal_code_seq')::text, 3, '0')
WHERE internal_code IS NULL;

ALTER TABLE products
  ALTER COLUMN internal_code SET NOT NULL;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS drive_train_i18n JSONB NOT NULL DEFAULT '{"en":"","es":""}'::jsonb,
  ADD COLUMN IF NOT EXISTS fuel_type_i18n JSONB NOT NULL DEFAULT '{"en":"","es":""}'::jsonb,
  ADD COLUMN IF NOT EXISTS description_i18n JSONB NOT NULL DEFAULT '{"en":"","es":""}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_currency_code_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_publish_status_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sale_status_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_year_range_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_mileage_range_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_by_currency_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_vin_number_length_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_description_length_check;

ALTER TABLE products
  ADD CONSTRAINT products_currency_code_check
    CHECK (currency_code IN ('CLP', 'USD')),
  ADD CONSTRAINT products_publish_status_check
    CHECK (publish_status IN ('draft', 'published')),
  ADD CONSTRAINT products_sale_status_check
    CHECK (sale_status IN ('available', 'sold', 'unavailable')),
  ADD CONSTRAINT products_year_range_check
    CHECK (year BETWEEN 1886 AND ((date_part('year', CURRENT_DATE))::integer + 1)),
  ADD CONSTRAINT products_mileage_range_check
    CHECK (mileage BETWEEN 0 AND 2000000),
  ADD CONSTRAINT products_price_by_currency_check
    CHECK (
      (currency_code = 'USD' AND price BETWEEN 500 AND 100000)
      OR
      (currency_code = 'CLP' AND price BETWEEN 500000 AND 100000000)
    ),
  ADD CONSTRAINT products_vin_number_length_check
    CHECK (char_length(vin_number) <= 17),
  ADD CONSTRAINT products_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 500);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_internal_code
ON products(internal_code);

CREATE INDEX IF NOT EXISTS idx_products_featured_at
ON products(featured_at DESC)
WHERE is_featured = TRUE;

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cloudinary_public_id VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
ON product_images(product_id);

CREATE INDEX IF NOT EXISTS idx_product_images_product_cover
ON product_images(product_id, is_cover);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_single_cover
ON product_images(product_id)
WHERE is_cover = TRUE;

-- Down Migration
-- Migration: 20260512000000000_create-catalog-core

DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP SEQUENCE IF EXISTS products_internal_code_seq;
