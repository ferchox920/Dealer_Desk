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
  await client.query('DROP TABLE IF EXISTS product_images');
  await client.query('DROP TABLE IF EXISTS products');
  await client.query('DROP TABLE IF EXISTS admins');
}

// Crea las tablas si no existen. También crea índices.
// CREATE TABLE IF NOT EXISTS = solo crea si no está (no falla si ya existe).
// En Sequelize: sequelize.sync()
async function ensureTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id UUID PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'staff')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY,
      year INTEGER NOT NULL,
      brand VARCHAR(255) NOT NULL,
      model VARCHAR(255) NOT NULL,
      mileage INTEGER NOT NULL,
      price INTEGER NOT NULL,
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
