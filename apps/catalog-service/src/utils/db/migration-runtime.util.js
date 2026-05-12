import pg from 'pg';
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { getCatalogDatabaseConfig } from './database-config.util.js';

const { Client } = pg;

const TARGET = {
  label: 'Catalog DB',
  migrationsDir: path.resolve(process.cwd(), 'src/entities/migrations/catalog'),
  migrationsTable: 'catalog_schema_migrations',
  requiredCommand: 'npm run migrate:up',
  getDatabaseConfig: getCatalogDatabaseConfig,
};

const SQL_MIGRATION_EXTENSION = '.sql';
const MIGRATION_TEMPLATE_PATH = path.resolve(
  process.cwd(),
  'src/scripts/migrations/templates/migration-template.sql',
);
const UP_MARKER = '-- Down Migration';

function slugifyMigrationName(rawSlug) {
  return String(rawSlug || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildUtcTimestampPrefix(now = new Date()) {
  return now.toISOString().replace(/\D/g, '').slice(0, 17);
}

function getMigrationNameFromFile(fileName) {
  return fileName.slice(0, -SQL_MIGRATION_EXTENSION.length);
}

function compareMigrationNames(leftName, rightName) {
  return leftName.localeCompare(rightName, undefined, {
    usage: 'sort',
    numeric: true,
    sensitivity: 'variant',
    ignorePunctuation: true,
  });
}

function splitMigrationSections(content) {
  const downMarkerIndex = content.indexOf(UP_MARKER);

  if (downMarkerIndex === -1) {
    return {
      upSql: content.trim(),
      downSql: '',
    };
  }

  return {
    upSql: content.slice(0, downMarkerIndex).trim(),
    downSql: content.slice(downMarkerIndex + UP_MARKER.length).trim(),
  };
}

async function listLocalMigrationNames() {
  try {
    const directoryEntries = await readdir(TARGET.migrationsDir, { withFileTypes: true });

    return directoryEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(SQL_MIGRATION_EXTENSION))
      .map((entry) => getMigrationNameFromFile(entry.name))
      .sort(compareMigrationNames);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function createDatabaseClient() {
  const client = new Client(TARGET.getDatabaseConfig());

  await client.connect();
  return client;
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${TARGET.migrationsTable} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      run_on TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function checkMigrationsTableExists(client) {
  const { rows } = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
      LIMIT 1
    `,
    [TARGET.migrationsTable],
  );

  return rows.length > 0;
}

async function getAppliedMigrationRows(client) {
  const tableExists = await checkMigrationsTableExists(client);

  if (!tableExists) {
    return [];
  }

  const { rows } = await client.query(
    `
      SELECT name, run_on
      FROM public."${TARGET.migrationsTable}"
      ORDER BY run_on ASC, id ASC
    `,
  );

  return rows;
}

async function getMigrationStatus() {
  const localNames = await listLocalMigrationNames();
  const client = await createDatabaseClient();

  try {
    const tableExists = await checkMigrationsTableExists(client);
    const appliedRows = tableExists ? await getAppliedMigrationRows(client) : [];
    const appliedNames = appliedRows.map((row) => row.name);
    const pendingNames = localNames.filter((name) => !appliedNames.includes(name));
    const missingLocalNames = appliedNames.filter((name) => !localNames.includes(name));

    return {
      ...TARGET,
      tableExists,
      localNames,
      appliedNames,
      pendingNames,
      missingLocalNames,
      databaseName: TARGET.getDatabaseConfig().database,
    };
  } finally {
    await client.end();
  }
}

function printMigrationStatus(status) {
  console.log(`Target: ${status.label}`);
  console.log(`Database: ${status.databaseName}`);
  console.log(`History table: public.${status.migrationsTable}`);
  console.log(`Local migrations: ${status.localNames.length}`);
  console.log(`Applied migrations: ${status.appliedNames.length}`);
  console.log(`Pending migrations: ${status.pendingNames.length}`);
  console.log(`Missing local definitions: ${status.missingLocalNames.length}`);
}

async function readMigrationSql(name) {
  const filePath = path.join(TARGET.migrationsDir, `${name}${SQL_MIGRATION_EXTENSION}`);
  const content = await readFile(filePath, 'utf8');
  return splitMigrationSections(content);
}

async function runMigrationDirection(direction, count) {
  const client = await createDatabaseClient();

  try {
    await client.query('BEGIN');
    await ensureMigrationsTable(client);
    const localNames = await listLocalMigrationNames();
    const appliedRows = await getAppliedMigrationRows(client);
    const appliedNames = appliedRows.map((row) => row.name);
    const limit = count ?? Number.MAX_SAFE_INTEGER;
    const migratedNames = [];

    if (direction === 'up') {
      const pendingNames = localNames.filter((name) => !appliedNames.includes(name)).slice(0, limit);

      for (const name of pendingNames) {
        const { upSql } = await readMigrationSql(name);

        if (upSql) {
          await client.query(upSql);
        }

        await client.query(
          `
            INSERT INTO ${TARGET.migrationsTable} (name)
            VALUES ($1)
          `,
          [name],
        );

        migratedNames.push(name);
      }
    } else {
      const rollbackNames = [...appliedNames].reverse().slice(0, limit);

      for (const name of rollbackNames) {
        const { downSql } = await readMigrationSql(name);

        if (downSql) {
          await client.query(downSql);
        }

        await client.query(
          `
            DELETE FROM ${TARGET.migrationsTable}
            WHERE name = $1
          `,
          [name],
        );

        migratedNames.push(name);
      }
    }

    await client.query('COMMIT');
    return migratedNames;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function createMigrationFile(rawSlug) {
  const slug = slugifyMigrationName(rawSlug);

  if (!slug) {
    throw new Error('Migration slug is required and must contain letters or numbers.');
  }

  await mkdir(TARGET.migrationsDir, { recursive: true });

  const migrationName = `${buildUtcTimestampPrefix()}_${slug}`;
  const filePath = path.join(TARGET.migrationsDir, `${migrationName}${SQL_MIGRATION_EXTENSION}`);
  const template = await readFile(MIGRATION_TEMPLATE_PATH, 'utf8');
  const fileContent = template
    .replaceAll('__MIGRATION_NAME__', migrationName)
    .replaceAll('__TARGET_LABEL__', TARGET.label)
    .replaceAll('__GENERATED_AT__', new Date().toISOString());

  await writeFile(filePath, fileContent, 'utf8');

  return filePath;
}

function buildReadinessError(status, reason, extraLines = []) {
  return new Error([
    `[${status.label}] ${reason}`,
    `Run ${status.requiredCommand} before starting the service.`,
    ...extraLines,
  ].join(' '));
}

async function ensureCatalogDatabaseReady() {
  const status = await getMigrationStatus();

  if (!status.tableExists) {
    throw buildReadinessError(status, 'Migration history table was not found.');
  }

  if (status.missingLocalNames.length > 0) {
    throw buildReadinessError(
      status,
      'The database references migration files that are missing locally.',
      [`Missing: ${status.missingLocalNames.join(', ')}.`],
    );
  }

  if (status.pendingNames.length > 0) {
    throw buildReadinessError(
      status,
      'There are pending migrations.',
      [`Pending: ${status.pendingNames.join(', ')}.`],
    );
  }

  return status;
}

export {
  createMigrationFile,
  ensureCatalogDatabaseReady,
  getMigrationStatus,
  printMigrationStatus,
  runMigrationDirection,
};
