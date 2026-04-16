import pg from 'pg';
import { getPlatformAdminRolesSqlList } from '../../constants/platform-roles.js';

const { Pool } = pg;
const PLATFORM_ADMIN_ROLES_SQL_LIST = getPlatformAdminRolesSqlList();

function getDatabaseEnv(platformName, sharedName, fallback = undefined) {
  const platformValue = process.env[platformName];

  if (typeof platformValue === 'string' && platformValue.trim().length > 0) {
    return platformValue.trim();
  }

  const sharedValue = process.env[sharedName];

  if (typeof sharedValue === 'string' && sharedValue.trim().length > 0) {
    return sharedValue.trim();
  }

  return fallback;
}

const pool = new Pool({
  database: getDatabaseEnv('PLATFORM_DB_NAME', 'DB_NAME', 'dealer_desk'),
  user: getDatabaseEnv('PLATFORM_DB_USER', 'DB_USER'),
  password: getDatabaseEnv('PLATFORM_DB_PASS', 'DB_PASS'),
  host: getDatabaseEnv('PLATFORM_DB_HOST', 'DB_HOST', 'localhost'),
  port: Number(getDatabaseEnv('PLATFORM_DB_PORT', 'DB_PORT', '5432')),
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

async function ensureTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS platform_admins (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN (${PLATFORM_ADMIN_ROLES_SQL_LIST})),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS platform_refresh_sessions (
      id UUID PRIMARY KEY,
      platform_admin_id UUID NOT NULL REFERENCES platform_admins(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      user_agent TEXT,
      ip_address VARCHAR(255),
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS systems (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(120) NOT NULL UNIQUE,
      status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'provisioning', 'active', 'suspended', 'archived')),
      plan_code VARCHAR(100) NOT NULL DEFAULT 'starter',
      admin_panel_url TEXT,
      public_site_url TEXT,
      custom_domain VARCHAR(255),
      default_subdomain VARCHAR(255),
      country_code VARCHAR(10),
      timezone VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS system_provisioning_runs (
      id UUID PRIMARY KEY,
      system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL
        CHECK (status IN ('pending', 'running', 'failed', 'completed')),
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      error_message TEXT,
      catalog_base_url TEXT,
      identity_base_url TEXT,
      database_name VARCHAR(255),
      owner_email VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query('CREATE INDEX IF NOT EXISTS idx_platform_refresh_sessions_admin_id ON platform_refresh_sessions(platform_admin_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_platform_refresh_sessions_expires_at ON platform_refresh_sessions(expires_at)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_systems_status ON systems(status)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_system_provisioning_runs_system_id ON system_provisioning_runs(system_id)');
}

async function sync() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
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
