import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';
import { generateOpaqueToken, sha256 } from '../utils/security/token.util.js';

const SYSTEM_TOKEN_SELECT = `
  id,
  system_id,
  token_hash,
  is_active,
  last_used_at,
  revoked_at,
  created_at,
  updated_at
`;

const PlatformSystemToken = {
  async createOrRotate(systemId, executor = query) {
    const plainToken = generateOpaqueToken(48);
    const tokenHash = sha256(plainToken);

    const { rows } = await executor(
      `
        INSERT INTO platform_system_tokens (
          id, system_id, token_hash, is_active, last_used_at, revoked_at
        )
        VALUES ($1, $2, $3, TRUE, NULL, NULL)
        ON CONFLICT (system_id)
        DO UPDATE SET
          token_hash = EXCLUDED.token_hash,
          is_active = TRUE,
          last_used_at = NULL,
          revoked_at = NULL,
          updated_at = NOW()
        RETURNING ${SYSTEM_TOKEN_SELECT}
      `,
      [
        uuidv4(),
        systemId,
        tokenHash,
      ],
    );

    return {
      record: rows[0],
      plainToken,
    };
  },

  async findBySystemId(systemId, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${SYSTEM_TOKEN_SELECT}
        FROM platform_system_tokens
        WHERE system_id = $1
        LIMIT 1
      `,
      [systemId],
    );

    return rows[0] ?? null;
  },

  async findActiveByPlainToken(plainToken, executor = query) {
    const tokenHash = sha256(plainToken);
    const { rows } = await executor(
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
      [tokenHash],
    );

    return rows[0] ?? null;
  },

  async touchLastUsed(id, executor = query) {
    const { rows } = await executor(
      `
        UPDATE platform_system_tokens
        SET last_used_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING ${SYSTEM_TOKEN_SELECT}
      `,
      [id],
    );

    return rows[0] ?? null;
  },
};

export default PlatformSystemToken;
