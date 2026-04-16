function getNumberEnv(name, fallback) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function getStringEnv(name, fallback) {
  const rawValue = process.env[name];

  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return fallback;
  }

  return rawValue.trim();
}

function getAllowedOrigin() {
  return getStringEnv('ADMIN_APP_ORIGIN', true);
}

function getGatewayPort() {
  return getNumberEnv('GATEWAY_PORT', 3001);
}

function getIdentityServicePort() {
  return getNumberEnv('IDENTITY_SERVICE_PORT', 3101);
}

function getIdentityServiceUrl() {
  return getStringEnv('IDENTITY_SERVICE_URL', `http://localhost:${getIdentityServicePort()}`);
}

function getCatalogServicePort() {
  return getNumberEnv('CATALOG_SERVICE_PORT', 3201);
}

function getCatalogServiceUrl() {
  return getStringEnv('CATALOG_SERVICE_URL', `http://localhost:${getCatalogServicePort()}`);
}

function getPlatformServicePort() {
  return getNumberEnv('PLATFORM_SERVICE_PORT', 3301);
}

function getPlatformServiceUrl() {
  return getStringEnv('PLATFORM_SERVICE_URL', `http://localhost:${getPlatformServicePort()}`);
}

export {
  getAllowedOrigin,
  getCatalogServicePort,
  getCatalogServiceUrl,
  getGatewayPort,
  getIdentityServicePort,
  getIdentityServiceUrl,
  getPlatformServicePort,
  getPlatformServiceUrl,
};
