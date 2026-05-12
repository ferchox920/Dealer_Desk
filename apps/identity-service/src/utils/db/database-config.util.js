function getIdentityDatabaseConfig() {
  return {
    database: process.env.DB_NAME || 'dealer_desk',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
  };
}

export { getIdentityDatabaseConfig };
