import pg from 'pg';
import { getAdminRolesSqlList } from '../../constants/admin-roles.js';

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
  await client.query('DROP TABLE IF EXISTS refresh_sessions');
  await client.query('DROP TABLE IF EXISTS password_action_tokens');
  await client.query('DROP TABLE IF EXISTS admins');
}

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
  await client.query('ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check');
  await client.query(`
    ALTER TABLE admins
    ADD CONSTRAINT admins_role_check
    CHECK (role IN (${ADMIN_ROLES_SQL_LIST}))
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS refresh_sessions (
      id UUID PRIMARY KEY,
      admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      user_agent TEXT,
      ip_address VARCHAR(255),
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    )
  `);

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

  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_password_action_tokens_token_hash ON password_action_tokens(token_hash)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_password_action_tokens_admin_id ON password_action_tokens(admin_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_password_action_tokens_expires_at ON password_action_tokens(expires_at)');
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
  sync,
  query,
  pool,
  withTransaction,
};

export { authenticate, pool, query, sync, withTransaction };
export default db;
