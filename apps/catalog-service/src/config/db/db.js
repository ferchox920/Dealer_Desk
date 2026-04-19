import pg from 'pg';
import {
  PRODUCT_MILEAGE_MAX,
  PRODUCT_MILEAGE_MIN,
  PRODUCT_PRICE_RANGES,
  PRODUCT_YEAR_MIN,
  getProductYearMax,
} from '../../constants/product-ranges.js';

const { Pool } = pg;

const pool = new Pool({
  database: process.env.DB_NAME || 'dealer_desk',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

async function query(text, params = []) {
  return await pool.query(text, params);
}

async function withTransaction(work) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function authenticate() {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

async function dropSchema(client) {
  await client.query('DROP TABLE IF EXISTS product_images');
  await client.query('DROP TABLE IF EXISTS products');
  await client.query('DROP SEQUENCE IF EXISTS products_internal_code_seq');
}

async function ensureProductsInternalCode(client) {
  await client.query(`
    CREATE SEQUENCE IF NOT EXISTS products_internal_code_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
  `);

  await client.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS internal_code VARCHAR(50)
  `);

  await client.query(`
    ALTER TABLE products
    ALTER COLUMN internal_code SET DEFAULT LPAD(nextval('products_internal_code_seq')::text, 3, '0')
  `);

  await client.query(`
    WITH max_existing AS (
      SELECT COALESCE(
        MAX(CASE WHEN internal_code ~ '^[0-9]+$' THEN internal_code::bigint END),
        0
      ) AS value
      FROM products
    ),
    missing_codes AS (
      SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS row_number
      FROM products
      WHERE internal_code IS NULL OR internal_code = ''
    )
    UPDATE products AS product
    SET internal_code = LPAD((max_existing.value + missing_codes.row_number)::text, 3, '0')
    FROM missing_codes, max_existing
    WHERE product.id = missing_codes.id
  `);

  const maxCodeResult = await client.query(`
    SELECT COALESCE(
      MAX(CASE WHEN internal_code ~ '^[0-9]+$' THEN internal_code::bigint END),
      0
    ) AS value
    FROM products
  `);

  const maxCode = String(maxCodeResult.rows[0]?.value ?? '0');
  const hasExistingNumericCodes = maxCode !== '0';

  await client.query(`
    SELECT setval(
      'products_internal_code_seq',
      $1::bigint,
      $2
    )
  `, [
    hasExistingNumericCodes ? maxCode : '1',
    hasExistingNumericCodes,
  ]);

  await client.query(`
    ALTER TABLE products
    ALTER COLUMN internal_code SET NOT NULL
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_internal_code
    ON products(internal_code)
  `);
}

async function ensureProductsCurrency(client) {
  await client.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10)
  `);

  await client.query(`
    UPDATE products
    SET currency_code = 'USD'
    WHERE currency_code IS NULL OR currency_code = ''
  `);

  await client.query(`
    ALTER TABLE products
    ALTER COLUMN currency_code SET DEFAULT 'USD'
  `);

  await client.query(`
    ALTER TABLE products
    ALTER COLUMN currency_code SET NOT NULL
  `);

  await client.query('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_currency_code_check');
  await client.query(`
    ALTER TABLE products
    ADD CONSTRAINT products_currency_code_check
    CHECK (currency_code IN ('CLP', 'USD'))
  `);
}

async function ensureProductsNumericBounds(client) {
  const productYearMax = getProductYearMax();

  await client.query('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_year_range_check');
  await client.query(`
    ALTER TABLE products
    ADD CONSTRAINT products_year_range_check
    CHECK (year BETWEEN ${PRODUCT_YEAR_MIN} AND ${productYearMax})
  `);

  await client.query('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_mileage_range_check');
  await client.query(`
    ALTER TABLE products
    ADD CONSTRAINT products_mileage_range_check
    CHECK (mileage BETWEEN ${PRODUCT_MILEAGE_MIN} AND ${PRODUCT_MILEAGE_MAX})
  `);

  await client.query('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_by_currency_check');
  await client.query(`
    ALTER TABLE products
    ADD CONSTRAINT products_price_by_currency_check
    CHECK (
      (currency_code = 'USD' AND price BETWEEN ${PRODUCT_PRICE_RANGES.USD.min} AND ${PRODUCT_PRICE_RANGES.USD.max})
      OR
      (currency_code = 'CLP' AND price BETWEEN ${PRODUCT_PRICE_RANGES.CLP.min} AND ${PRODUCT_PRICE_RANGES.CLP.max})
    )
  `);
}

async function ensureTables(client) {
  await client.query(`
    CREATE SEQUENCE IF NOT EXISTS products_internal_code_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY,
      internal_code VARCHAR(50) NOT NULL DEFAULT LPAD(nextval('products_internal_code_seq')::text, 3, '0'),
      year INTEGER NOT NULL,
      brand VARCHAR(255) NOT NULL,
      model VARCHAR(255) NOT NULL,
      mileage INTEGER NOT NULL,
      price INTEGER NOT NULL,
      currency_code VARCHAR(10) NOT NULL DEFAULT 'USD' CHECK (currency_code IN ('CLP', 'USD')),
      drive_train VARCHAR(255) NOT NULL,
      fuel_type VARCHAR(255) NOT NULL,
      vin_number VARCHAR(255) NOT NULL,
      description TEXT,
      publish_status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published')),
      sale_status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (sale_status IN ('available', 'sold', 'unavailable')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await ensureProductsInternalCode(client);
  await ensureProductsCurrency(client);
  await ensureProductsNumericBounds(client);

  await client.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id UUID PRIMARY KEY,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      cloudinary_public_id VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_cover BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query('CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_product_images_product_cover ON product_images(product_id, is_cover)');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_single_cover ON product_images(product_id) WHERE is_cover = TRUE');
}

async function sync(options = {}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (options.force) {
      await dropSchema(client);
    }

    await ensureTables(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

const db = {
  authenticate,
  pool,
  query,
  sync,
  withTransaction,
};

export { authenticate, pool, query, sync, withTransaction };
export default db;
