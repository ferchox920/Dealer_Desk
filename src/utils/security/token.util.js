// ============================================================================
// token.util.js
//
// Utilidades para firmar y verificar access tokens.
// Importante: el JWT aquí se VERIFICA y DECODIFICA, no se "desencripta".
// ============================================================================

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

// El access token es una "credencial portátil" corta.
// Lo firmamos con una secret para que el backend pueda comprobar
// que el token fue emitido por nosotros y no fue alterado.
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

// verify NO desencripta nada: solo comprueba firma, issuer, audience y expiración.
// Si todo está bien, devuelve el payload ya decodificado.
function verifyAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

// El refresh token es opaco: no es JWT, no lleva información legible adentro.
// Solo sirve como "llave de renovación" para pedir otro access token.
function generateOpaqueToken(byteLength = 48) {
  return crypto.randomBytes(byteLength).toString('hex');
}

function generateOpaqueRefreshToken() {
  return generateOpaqueToken(48);
}

// Reutilizamos el mismo patrón para enlaces sensibles por correo:
// token aleatorio largo + hash en DB + expiración.
function generateOpaqueActionToken() {
  return generateOpaqueToken(48);
}

// Nunca guardamos tokens sensibles "en claro" en la DB si podemos evitarlo.
// sha256 nos deja comparar valores sin persistir el token original.
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
