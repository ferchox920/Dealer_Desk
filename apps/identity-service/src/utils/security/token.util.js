import crypto from 'crypto';
import jwt from 'jsonwebtoken';

function getRequiredEnv(name, { minLength = 1 } = {}) {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim().length < minLength) {
    throw new Error(`${name} must be set in the environment with at least ${minLength} characters.`);
  }

  return value.trim();
}

const JWT_ACCESS_SECRET = getRequiredEnv('JWT_ACCESS_SECRET', { minLength: 32 });
const JWT_ISSUER = process.env.JWT_ISSUER?.trim() || 'dealer-desk-admin';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE?.trim() || 'dealer-desk-admin-api';
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL?.trim() || '15m';

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

function generateOpaqueToken(byteLength = 48) {
  return crypto.randomBytes(byteLength).toString('hex');
}

function generateOpaqueRefreshToken() {
  return generateOpaqueToken(48);
}

function generateOpaqueActionToken() {
  return generateOpaqueToken(48);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export {
  generateOpaqueActionToken,
  generateOpaqueRefreshToken,
  generateOpaqueToken,
  sha256,
  signAccessToken,
  verifyAccessToken,
};
