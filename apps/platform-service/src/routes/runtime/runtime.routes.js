import express from 'express';
import db from '../../config/db/db.js';
import PlatformAdmin from '../../entities/platform-admin.entity.js';
import systemService from '../../services/systems/system.service.js';
import {
  sha256,
  verifyAccessToken,
} from '../../utils/security/token.util.js';
import { validateSystemId } from '../../utils/validations/systems/system.validation.js';

const runtimeRoutes = express.Router();

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

async function resolveRuntimeActor(req, res) {
  const authorization = req.get('authorization') || req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    res.status(401).json({
      status: 401,
      error: 'Platform authentication required.',
      code: 'PLATFORM_AUTH_REQUIRED',
    });
    return null;
  }

  const token = authorization.replace('Bearer ', '').trim();
  const looksLikeJwt = token.includes('.');

  if (looksLikeJwt) {
    try {
      const payload = verifyAccessToken(token);
      const platformAdmin = await PlatformAdmin.findByPk(payload.sub);

      if (platformAdmin && platformAdmin.is_active) {
        return {
          id: platformAdmin.id,
          name: platformAdmin.name,
          email: platformAdmin.email,
          role: platformAdmin.role,
          actor_type: 'platform_admin',
        };
      }
    } catch (_error) {
      // Si no es JWT valido, seguimos con token tecnico.
    }
  }

  const systemToken = await findRuntimeSystemToken(token);

  if (!systemToken) {
    res.status(401).json({
      status: 401,
      error: 'Invalid or expired platform token.',
      code: 'PLATFORM_TOKEN_INVALID',
    });
    return null;
  }

  if (req.params.id && req.params.id !== systemToken.system_id) {
    res.status(403).json({
      status: 403,
      error: 'The token does not belong to the requested system.',
      code: 'PLATFORM_SYSTEM_TOKEN_SCOPE_INVALID',
    });
    return null;
  }

  await db.query(
    `
      UPDATE platform_system_tokens
      SET last_used_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `,
    [systemToken.id],
  );

  return {
    id: systemToken.system_id,
    role: 'system',
    actor_type: 'system',
    system_id: systemToken.system_id,
    system_slug: systemToken.system_slug,
    system_status: systemToken.system_status,
    token_id: systemToken.id,
  };
}

function sendRuntimeError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
  });
}

runtimeRoutes.get('/systems/:id/runtime', validateSystemId, async (req, res) => {
  try {
    const actor = await resolveRuntimeActor(req, res);

    if (!actor) {
      return;
    }

    req.platformUser = actor;
    const runtime = await systemService.getRuntime(req.params.id);
    return res.status(200).json({ status: 200, data: runtime });
  } catch (error) {
    return sendRuntimeError(res, error);
  }
});

runtimeRoutes.get('/systems/:id/limits', validateSystemId, async (req, res) => {
  try {
    const actor = await resolveRuntimeActor(req, res);

    if (!actor) {
      return;
    }

    req.platformUser = actor;
    const limits = await systemService.getRuntimeLimits(req.params.id);
    return res.status(200).json({ status: 200, data: limits });
  } catch (error) {
    return sendRuntimeError(res, error);
  }
});

runtimeRoutes.get('/systems/:id/status', validateSystemId, async (req, res) => {
  try {
    const actor = await resolveRuntimeActor(req, res);

    if (!actor) {
      return;
    }

    req.platformUser = actor;
    const status = await systemService.getRuntimeStatus(req.params.id);
    return res.status(200).json({ status: 200, data: status });
  } catch (error) {
    return sendRuntimeError(res, error);
  }
});

export default runtimeRoutes;
