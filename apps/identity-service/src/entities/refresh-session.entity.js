import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';
import { sha256 } from '../utils/security/token.util.js';

const REFRESH_SESSION_SELECT = `
  id,
  admin_id,
  token_hash,
  user_agent,
  ip_address,
  expires_at,
  revoked_at,
  last_used_at,
  created_at,
  updated_at
`;

const RefreshSession = {
  async create(data, executor = query) {
    const { rows } = await executor(
      `
        INSERT INTO refresh_sessions (
          id, admin_id, token_hash, user_agent, ip_address, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING ${REFRESH_SESSION_SELECT}
      `,
      [
        uuidv4(),
        data.admin_id,
        sha256(data.refresh_token),
        data.user_agent ?? null,
        data.ip_address ?? null,
        data.expires_at,
      ],
    );

    return rows[0] ?? null;
  },

  async findByPlainTokenForUpdate(refreshToken, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${REFRESH_SESSION_SELECT}
        FROM refresh_sessions
        WHERE token_hash = $1
        LIMIT 1
        FOR UPDATE
      `,
      [sha256(refreshToken)],
    );

    return rows[0] ?? null;
  },

  async revokeById(id, executor = query) {
    const { rows } = await executor(
      `
        UPDATE refresh_sessions
        SET revoked_at = COALESCE(revoked_at, NOW()),
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING ${REFRESH_SESSION_SELECT}
      `,
      [id],
    );

    return rows[0] ?? null;
  },

  async revokeByPlainToken(refreshToken, executor = query) {
    const { rows } = await executor(
      `
        UPDATE refresh_sessions
        SET revoked_at = COALESCE(revoked_at, NOW()),
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE token_hash = $1
        RETURNING ${REFRESH_SESSION_SELECT}
      `,
      [sha256(refreshToken)],
    );

    return rows[0] ?? null;
  },
};

export default RefreshSession;
