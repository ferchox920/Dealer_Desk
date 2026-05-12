import '@dealer-desk/shared-config/load-env';
import path from 'node:path';
import {
  createMigrationFile,
  getMigrationStatus,
  printMigrationStatus,
  runMigrationDirection,
} from '../../utils/db/migration-runtime.util.js';

function printHelp() {
  console.log('Usage: node src/scripts/migrations/catalog.cli.js <create|up|down|status> [value]');
}

function formatCliErrorMessage(error) {
  if (!error) {
    return 'Unknown catalog migration error.';
  }

  if (typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message.trim();
  }

  if (error.code === 'ECONNREFUSED' && Array.isArray(error.errors) && error.errors.length > 0) {
    const attempts = error.errors
      .map((nestedError) => `${nestedError.address}:${nestedError.port}`)
      .join(', ');

    return `Could not connect to PostgreSQL. Connection attempts failed for: ${attempts}.`;
  }

  if (typeof error.code === 'string' && error.code.length > 0) {
    return `Catalog migration error (${error.code}).`;
  }

  return String(error);
}

function parseCountArgument(rawValue) {
  if (rawValue === undefined) {
    return undefined;
  }

  const parsedValue = Number.parseInt(String(rawValue), 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error('Migration count must be a positive integer.');
  }

  return parsedValue;
}

async function run() {
  const [command, rawValue] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help') {
    printHelp();
    return;
  }

  if (command === 'create') {
    const filePath = await createMigrationFile(rawValue);
    console.log(`Created catalog migration: ${path.relative(process.cwd(), filePath)}`);
    return;
  }

  if (command === 'status') {
    const status = await getMigrationStatus();
    printMigrationStatus(status);
    return;
  }

  if (command === 'up' || command === 'down') {
    const migratedFiles = await runMigrationDirection(command, parseCountArgument(rawValue));

    if (migratedFiles.length === 0) {
      console.log('No catalog migrations to run.');
      return;
    }

    console.log(`Catalog migrations ${command} complete.`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

run().catch((error) => {
  if (error?.code === '3D000') {
    console.error(
      `Catalog migration CLI failed: database "${process.env.DB_NAME || 'dealer_desk'}" does not exist yet.`,
    );
    process.exit(1);
  }

  console.error('Catalog migration CLI failed:', formatCliErrorMessage(error));
  process.exit(1);
});
