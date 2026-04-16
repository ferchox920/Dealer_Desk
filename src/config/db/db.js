// ============================================================================
// db.js
//
// Conexión a PostgreSQL usando el driver "pg".
//
// Concepto clave — Pool de conexiones:
//   En vez de abrir y cerrar una conexión por cada query, el Pool mantiene
//   varias conexiones abiertas y las reutiliza. Esto es mucho más rápido.
//   max: 10 = máximo 10 conexiones simultáneas.
//
// En Sequelize todo esto estaba oculto dentro de new Sequelize(...).
// Aquí lo manejamos directamente.
//
// Exporta:
//   - query(): ejecutar SQL simple
//   - withTransaction(): ejecutar varias queries atómicamente
//   - authenticate(): probar que la DB esté viva
//   - sync(): crear (o recrear) las tablas
// ============================================================================

import pg from 'pg';
import { getAdminRolesSqlList } from '../../constants/admin-roles.js';
import {
  PRODUCT_MILEAGE_MAX,
  PRODUCT_MILEAGE_MIN,
  PRODUCT_PRICE_RANGES,
  PRODUCT_YEAR_MIN,
  getProductYearMax,
} from '../../constants/product-ranges.js';

const { Pool } = pg;
const ADMIN_ROLES_SQL_LIST = getAdminRolesSqlList();

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

// Atajo para ejecutar una query suelta.
// Ejemplo: await query('SELECT * FROM products WHERE id = $1', ['abc'])
// El pool se encarga de tomar una conexión, ejecutar, y devolverla.
async function query(text, params = []) {
  return await pool.query(text, params);
}

// Ejecuta varias queries dentro de una TRANSACCIÓN.
// Si todo sale bien → COMMIT (se guardan los cambios).
// Si algo falla → ROLLBACK (se deshace todo, como si nada hubiera pasado).
//
// El parámetro "work" recibe el client, y usas client.query() en vez de query().
//
// Ejemplo de uso (en product-image.service.js):
//   await db.withTransaction(async (client) => {
//     const executor = client.query.bind(client);
//     await ProductImage.bulkCreate(records, executor);
//   });
//
// En Sequelize: await sequelize.transaction(async (t) => { ... })
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

// Prueba que la conexión a PostgreSQL funcione.
// Se llama al iniciar el servidor en main.js.
// En Sequelize: sequelize.authenticate()
async function authenticate() {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

// Borra las tablas en orden correcto (primero las que tienen foreign keys).
// Solo se usa cuando DB_SYNC_MODE=force.
async function dropSchema(client) {
  await client.query('DROP TABLE IF EXISTS refresh_sessions');
  await client.query('DROP TABLE IF EXISTS password_action_tokens');
  await client.query('DROP TABLE IF EXISTS product_images');
  await client.query('DROP TABLE IF EXISTS products');
  await client.query('DROP SEQUENCE IF EXISTS products_internal_code_seq');
  await client.query('DROP TABLE IF EXISTS admins');
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
        -- internal_code se guarda como texto porque es visible al usuario,
        -- pero para calcular máximos usamos bigint y evitamos topes de integer.
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

  // pg devuelve bigint como string por defecto.
  // Lo conservamos así para no pasar por Number() y evitar pérdida de precisión.
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

// Crea las tablas si no existen. También crea índices.
// CREATE TABLE IF NOT EXISTS = solo crea si no está (no falla si ya existe).
// En Sequelize: sequelize.sync()
async function ensureTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id UUID PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      role VARCHAR(50) NOT NULL CONSTRAINT admins_role_check CHECK (role IN (${ADMIN_ROLES_SQL_LIST})),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at TIMESTAMPTZ,
      created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS name VARCHAR(255)');
  await client.query('ALTER TABLE admins ALTER COLUMN password_hash DROP NOT NULL');
  await client.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ');
  await client.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL');
  // Reinstalamos la constraint con nombre fijo para que, cuando en el futuro
  // agregues un rol como "manager", el cambio principal sea actualizar
  // src/constants/admin-roles.js y volver a sincronizar.
  // "constraint" significa una regla que la base de datos hace cumplir.
  // En este caso, CHECK(role IN (...)) obliga a que PostgreSQL solo acepte
  // roles que estén en la lista permitida.
  await client.query('ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check');
  await client.query(`
    ALTER TABLE admins
    ADD CONSTRAINT admins_role_check
    CHECK (role IN (${ADMIN_ROLES_SQL_LIST}))
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS refresh_sessions (
      id UUID PRIMARY KEY,
      -- La sesión pertenece a un admin concreto del panel.
      admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      -- Guardamos hash, no el token real. Así protegemos mejor la sesión
      -- incluso si alguien lograra leer la base de datos.
      token_hash VARCHAR(255) NOT NULL,
      user_agent TEXT,
      ip_address VARCHAR(255),
      -- Fecha máxima hasta la que este refresh token puede renovarse.
      expires_at TIMESTAMPTZ NOT NULL,
      -- revoked_at se usa para invalidar manualmente una sesión
      -- sin borrar el registro y perder trazabilidad.
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    )
  `);

  // Guardamos el hash del refresh token, no el token original.
  // Así, si alguien leyera la DB, no podría reutilizar la sesión directamente.
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_sessions_token_hash ON refresh_sessions(token_hash)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_refresh_sessions_admin_id ON refresh_sessions(admin_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_refresh_sessions_expires_at ON refresh_sessions(expires_at)');

  await client.query(`
    CREATE TABLE IF NOT EXISTS password_action_tokens (
      id UUID PRIMARY KEY,
      admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('invite', 'forgot_password')),
      token_hash VARCHAR(255) NOT NULL,
      delivery_email VARCHAR(255) NOT NULL,
      requested_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // token_hash queda unico para que no exista ambiguedad al verificar.
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_password_action_tokens_token_hash ON password_action_tokens(token_hash)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_password_action_tokens_admin_id ON password_action_tokens(admin_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_password_action_tokens_expires_at ON password_action_tokens(expires_at)');

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
      -- Relacion 1:N: un producto puede tener muchas imagenes.
      -- ON DELETE CASCADE asegura que si se borra el producto,
      -- PostgreSQL elimina tambien sus imagenes relacionadas.
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      cloudinary_public_id VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_cover BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Índice para buscar imágenes por producto rápidamente
  await client.query('CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)');
  // Índice compuesto para buscar la portada de un producto
  await client.query('CREATE INDEX IF NOT EXISTS idx_product_images_product_cover ON product_images(product_id, is_cover)');
  // Índice único parcial: garantiza que solo UNA imagen por producto tenga is_cover=TRUE.
  // El "WHERE is_cover = TRUE" hace que solo aplique a filas con portada activa.
  // Si intentas poner dos portadas en el mismo producto, PostgreSQL lanza error.
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_single_cover ON product_images(product_id) WHERE is_cover = TRUE');
}

// Sincroniza el esquema de la DB.
// options.force = true → borra todo y recrea (solo para desarrollo).
// Sin force → solo asegura que las tablas existan.
// En Sequelize: sequelize.sync({ force: true })
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
  sync,
  query,
  pool,
  withTransaction,
};

export { authenticate, pool, query, sync, withTransaction };
export default db;
