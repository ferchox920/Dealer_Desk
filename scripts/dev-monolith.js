const isLegacyMonolithEnabled = process.env.ENABLE_LEGACY_MONOLITH === 'true';

if (!isLegacyMonolithEnabled) {
  console.error('Legacy monolith startup is disabled by default.');
  console.error('Use ENABLE_LEGACY_MONOLITH=true npm run monolith:dev only for legacy checks or migration support.');
  process.exit(1);
}

await import('../src/main.js');
