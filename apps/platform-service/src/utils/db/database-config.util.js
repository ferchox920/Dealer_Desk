function getPlatformDatabaseConfig() {
  return {
    database: process.env.PLATFORM_DB_NAME || process.env.DB_NAME || 'dealer_desk',
    user: process.env.PLATFORM_DB_USER || process.env.DB_USER,
    password: process.env.PLATFORM_DB_PASS || process.env.DB_PASS,
    host: process.env.PLATFORM_DB_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.PLATFORM_DB_PORT || process.env.DB_PORT || 5432),
  };
}

export { getPlatformDatabaseConfig };
