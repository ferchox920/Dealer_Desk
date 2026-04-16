import { v4 as uuidv4 } from 'uuid';
import db from '../../config/db/db.js';
import PlatformAdmin from '../../entities/platform-admin.entity.js';
import { createHttpError } from '../../utils/errors/app-error.util.js';
import { trimBoundaryWhitespace } from '../../utils/normalizers/string-normalizer.util.js';
import { serializePlatformAdmin } from '../../utils/serializers/platform-admin.serializer.js';
import { verifyPassword } from '../../utils/security/password.util.js';
import {
  generateOpaqueRefreshToken,
  sha256,
  signAccessToken,
} from '../../utils/security/token.util.js';

function normalizeEmail(email) {
  return trimBoundaryWhitespace(email).toLowerCase();
}

function normalizePassword(password) {
  return trimBoundaryWhitespace(password);
}

function buildRefreshTokenExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Number(process.env.PLATFORM_REFRESH_TOKEN_TTL_DAYS || process.env.REFRESH_TOKEN_TTL_DAYS || 30));
  return expiresAt;
}

async function createRefreshSession(client, { adminId, refreshToken, userAgent, ipAddress, expiresAt }) {
  const tokenHash = sha256(refreshToken);

  await client.query(
    `
      INSERT INTO platform_refresh_sessions (
        id, platform_admin_id, token_hash, user_agent, ip_address, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      uuidv4(),
      adminId,
      tokenHash,
      userAgent ?? null,
      ipAddress ?? null,
      expiresAt,
    ],
  );
}

async function findRefreshSessionForUpdate(client, refreshToken) {
  const tokenHash = sha256(refreshToken);

  const { rows } = await client.query(
    `
      SELECT id, platform_admin_id, expires_at, revoked_at
      FROM platform_refresh_sessions
      WHERE token_hash = $1
      LIMIT 1
      FOR UPDATE
    `,
    [tokenHash],
  );

  return rows[0] ?? null;
}

async function revokeRefreshSession(client, sessionId) {
  await client.query(
    `
      UPDATE platform_refresh_sessions
      SET revoked_at = COALESCE(revoked_at, NOW()),
          last_used_at = NOW()
      WHERE id = $1
    `,
    [sessionId],
  );
}

class AuthService {
  async login({ email, password, userAgent, ipAddress }) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = normalizePassword(password);
    const admin = await PlatformAdmin.findOneByEmail(normalizedEmail);

    if (!admin || !admin.is_active) {
      throw createHttpError(401, 'Invalid credentials.', 'PLATFORM_AUTH_INVALID_CREDENTIALS');
    }

    const passwordOk = await verifyPassword(normalizedPassword, admin.password_hash);

    if (!passwordOk) {
      throw createHttpError(401, 'Invalid credentials.', 'PLATFORM_AUTH_INVALID_CREDENTIALS');
    }

    const refreshToken = generateOpaqueRefreshToken();
    const expiresAt = buildRefreshTokenExpiryDate();

    await db.withTransaction(async (client) => {
      await createRefreshSession(client, {
        adminId: admin.id,
        refreshToken,
        userAgent,
        ipAddress,
        expiresAt,
      });

      await client.query(
        `
          UPDATE platform_admins
          SET last_login_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `,
        [admin.id],
      );
    });

    const updatedAdmin = await PlatformAdmin.findByPk(admin.id);

    return {
      accessToken: signAccessToken(updatedAdmin),
      refreshToken,
      admin: serializePlatformAdmin(updatedAdmin),
    };
  }

  async refresh({ refreshToken, userAgent, ipAddress }) {
    if (!refreshToken) {
      throw createHttpError(401, 'Refresh token required.', 'PLATFORM_REFRESH_TOKEN_REQUIRED');
    }

    return await db.withTransaction(async (client) => {
      const session = await findRefreshSessionForUpdate(client, refreshToken);

      if (!session) {
        throw createHttpError(401, 'Invalid refresh token.', 'PLATFORM_REFRESH_TOKEN_INVALID');
      }

      if (session.revoked_at) {
        throw createHttpError(401, 'Refresh token revoked.', 'PLATFORM_REFRESH_TOKEN_REVOKED');
      }

      if (new Date(session.expires_at) <= new Date()) {
        throw createHttpError(401, 'Refresh token expired.', 'PLATFORM_REFRESH_TOKEN_EXPIRED');
      }

      const admin = await PlatformAdmin.findByPk(session.platform_admin_id);

      if (!admin || !admin.is_active) {
        throw createHttpError(401, 'Invalid session.', 'PLATFORM_SESSION_INVALID');
      }

      const newRefreshToken = generateOpaqueRefreshToken();
      const newExpiresAt = buildRefreshTokenExpiryDate();

      await revokeRefreshSession(client, session.id);
      await createRefreshSession(client, {
        adminId: admin.id,
        refreshToken: newRefreshToken,
        userAgent,
        ipAddress,
        expiresAt: newExpiresAt,
      });

      return {
        accessToken: signAccessToken(admin),
        refreshToken: newRefreshToken,
        admin: serializePlatformAdmin(admin),
      };
    });
  }

  async logout({ refreshToken }) {
    if (!refreshToken) {
      return;
    }

    await db.query(
      `
        UPDATE platform_refresh_sessions
        SET revoked_at = COALESCE(revoked_at, NOW()),
            last_used_at = NOW()
        WHERE token_hash = $1
      `,
      [sha256(refreshToken)],
    );
  }

  async getCurrentAdmin(adminId) {
    const admin = await PlatformAdmin.findByPk(adminId);

    if (!admin || !admin.is_active) {
      throw createHttpError(404, 'Platform admin not found.', 'PLATFORM_ADMIN_NOT_FOUND');
    }

    return serializePlatformAdmin(admin);
  }
}

export default new AuthService();
