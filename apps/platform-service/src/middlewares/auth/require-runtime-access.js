import PlatformAdmin from '../../entities/platform-admin.entity.js';
import PlatformSystemToken from '../../entities/system-token.entity.js';
import db from '../../config/db/db.js';
import {
  sha256,
  verifyAccessToken,
} from '../../utils/security/token.util.js';

async function findRuntimeSystemToken(plainToken) {
  const { rows } = await db.query(
    `
      SELECT
        token.id,
        token.system_id,
        token.token_hash,
        token.is_active,
        token.last_used_at,
        token.revoked_at,
        token.created_at,
        token.updated_at,
        system.name AS system_name,
        system.slug AS system_slug,
        system.status AS system_status
      FROM platform_system_tokens AS token
      INNER JOIN platform_systems AS system ON system.id = token.system_id
      WHERE token.token_hash = $1
        AND token.is_active = TRUE
        AND token.revoked_at IS NULL
      LIMIT 1
    `,
    [sha256(plainToken)],
  );

  return rows[0] ?? null;
}

async function requireRuntimeAccess(req, res, next) {
  const authorization = req.get('authorization') || req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 401,
      error: 'Platform authentication required.',
      code: 'PLATFORM_AUTH_REQUIRED',
    });
  }

  const token = authorization.replace('Bearer ', '').trim();
  const looksLikeJwt = token.includes('.');

  console.log('[platform-runtime-debug] incoming token', {
    path: req.path,
    authorizationPrefix: authorization.slice(0, 12),
    tokenLength: token.length,
    looksLikeJwt,
    systemId: req.params.id,
  });

  if (looksLikeJwt) {
    try {
      const payload = verifyAccessToken(token);
      const platformAdmin = await PlatformAdmin.findByPk(payload.sub);

      if (platformAdmin && platformAdmin.is_active) {
        req.platformUser = {
          id: platformAdmin.id,
          name: platformAdmin.name,
          email: platformAdmin.email,
          role: platformAdmin.role,
          actor_type: 'platform_admin',
        };

        return next();
      }
    } catch (_error) {
      // Si no es un JWT valido, seguimos con el token tecnico del sistema.
    }
  }

  const systemToken = await findRuntimeSystemToken(token);

  console.log('[platform-runtime-debug] system token lookup', {
    found: Boolean(systemToken),
    tokenHashPrefix: sha256(token).slice(0, 12),
    systemId: systemToken?.system_id ?? null,
  });

  if (!systemToken) {
    return res.status(401).json({
      status: 401,
      error: 'Invalid or expired platform token.',
      code: 'PLATFORM_TOKEN_INVALID',
    });
  }

  if (req.params.id && req.params.id !== systemToken.system_id) {
    return res.status(403).json({
      status: 403,
      error: 'The token does not belong to the requested system.',
      code: 'PLATFORM_SYSTEM_TOKEN_SCOPE_INVALID',
    });
  }

  await PlatformSystemToken.touchLastUsed(systemToken.id);

  req.platformUser = {
    id: systemToken.system_id,
    role: 'system',
    actor_type: 'system',
    system_id: systemToken.system_id,
    system_slug: systemToken.system_slug,
    system_status: systemToken.system_status,
    token_id: systemToken.id,
  };

  return next();
}

export { requireRuntimeAccess };
