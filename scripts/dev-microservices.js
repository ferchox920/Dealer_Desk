import { spawn } from 'node:child_process';

const SERVICES = [
  { name: 'gateway', workspace: '@dealer-desk/api-gateway' },
  { name: 'identity', workspace: '@dealer-desk/identity-service' },
  { name: 'catalog', workspace: '@dealer-desk/catalog-service' },
  { name: 'platform', workspace: '@dealer-desk/platform-service' },
];

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = new Set();
let isShuttingDown = false;

function writePrefixedChunk(prefix, chunk, writer = process.stdout) {
  const lines = String(chunk)
    .replace(/\r\n/g, '\n')
    .split('\n');

  for (const line of lines) {
    if (line.length === 0) {
      continue;
    }

    writer.write(`[${prefix}] ${line}\n`);
  }
}

function stopChildren(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 150);
}

for (const service of SERVICES) {
  const child = spawn(
    npmCommand,
    ['run', 'dev', '--workspace', service.workspace],
    {
      cwd: process.cwd(),
      env: process.env,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  children.add(child);

  child.stdout.on('data', (chunk) => {
    writePrefixedChunk(service.name, chunk, process.stdout);
  });

  child.stderr.on('data', (chunk) => {
    writePrefixedChunk(service.name, chunk, process.stderr);
  });

  child.on('exit', (code, signal) => {
    children.delete(child);

    if (isShuttingDown) {
      return;
    }

    const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[orchestrator] ${service.name} exited with ${detail}.`);
    stopChildren(code ?? 1);
  });
}

console.log('[orchestrator] Starting microservices dev stack: gateway, identity, catalog, platform.');
console.log('[orchestrator] Use Ctrl+C to stop all services together.');

process.on('SIGINT', () => stopChildren(0));
process.on('SIGTERM', () => stopChildren(0));
