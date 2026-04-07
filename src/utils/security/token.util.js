// ============================================================================
// token.util.js
//
// Utilidades para firmar y verificar access tokens.
// Importante: el JWT aquí se VERIFICA y DECODIFICA, no se "desencripta".
// ============================================================================

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dealer-desk-dev-access-secret';
const JWT_ISSUER = process.env.JWT_ISSUER || 'dealer-desk-admin';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'dealer-desk-admin-api';
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';

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
function generateOpaqueRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

// Nunca guardamos tokens sensibles "en claro" en la DB si podemos evitarlo.
// sha256 nos deja comparar valores sin persistir el token original.
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export { generateOpaqueRefreshToken, sha256, signAccessToken, verifyAccessToken };
