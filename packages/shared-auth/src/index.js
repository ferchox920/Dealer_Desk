import jwt from 'jsonwebtoken';

const AUTH_CONTEXT_HEADER_MAP = {
  accessToken: 'x-access-token',
  adminEmail: 'x-admin-email',
  adminId: 'x-admin-id',
  adminRole: 'x-admin-role',
  isAuthenticated: 'x-authenticated',
};

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

function getBearerTokenFromAuthorizationHeader(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.replace('Bearer ', '').trim();
  return token || null;
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

function buildForwardedAuthContext({ accessToken = null, accessTokenPayload = null } = {}) {
  return {
    accessToken,
    adminEmail: accessTokenPayload?.email ?? null,
    adminId: accessTokenPayload?.sub ?? null,
    adminRole: accessTokenPayload?.role ?? null,
    isAuthenticated: accessTokenPayload ? 'true' : 'false',
  };
}

export {
  AUTH_CONTEXT_HEADER_MAP,
  buildForwardedAuthContext,
  getBearerTokenFromAuthorizationHeader,
  verifyAccessToken,
};
