import crypto from 'crypto';
import jwt from 'jsonwebtoken';

function getRequiredEnv(name, { minLength = 1 } = {}) {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim().length < minLength) {
    throw new Error(`${name} must be set in the environment with at least ${minLength} characters.`);
  }

  return value.trim();
}

const JWT_ACCESS_SECRET = process.env.PLATFORM_JWT_ACCESS_SECRET?.trim()
  || getRequiredEnv('JWT_ACCESS_SECRET', { minLength: 32 });
const JWT_ISSUER = process.env.PLATFORM_JWT_ISSUER?.trim() || 'dealer-desk-platform';
const JWT_AUDIENCE = process.env.PLATFORM_JWT_AUDIENCE?.trim() || 'dealer-desk-platform-api';
const ACCESS_TOKEN_TTL = process.env.PLATFORM_ACCESS_TOKEN_TTL?.trim() || process.env.ACCESS_TOKEN_TTL?.trim() || '15m';

function signAccessToken(admin) {
  return jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    },
    JWT_ACCESS_SECRET,
    {
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: ACCESS_TOKEN_TTL,
    },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

function generateOpaqueRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export {
  generateOpaqueRefreshToken,
  sha256,
  signAccessToken,
  verifyAccessToken,
};
