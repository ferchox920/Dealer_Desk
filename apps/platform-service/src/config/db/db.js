import pg from 'pg';
import { getPlatformDatabaseConfig } from '../../utils/db/database-config.util.js';

const { Pool } = pg;
const pool = new Pool({
  ...getPlatformDatabaseConfig(),
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

const db = {
  authenticate,
  pool,
  query,
  withTransaction,
};

export { authenticate, pool, query, withTransaction };
export default db;
