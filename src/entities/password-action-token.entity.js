// ============================================================================
// password-action-token.entity.js
//
// Guarda links sensibles de un solo uso para:
//  - setup inicial de password por invitacion
//  - recuperacion de password olvidada
//
// Regla de seguridad principal:
// nunca guardamos el token en claro, solo su hash SHA-256.
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';
import { buildInsertParts, buildWhereEqualsClause } from './helpers.entity.js';

const PASSWORD_ACTION_TOKEN_SELECT = `
  id,
  admin_id,
  purpose,
  token_hash,
  delivery_email,
  requested_by_admin_id,
  expires_at,
  used_at,
  created_at
`;

const PasswordActionToken = {
  async create(data, executor = query) {
    const insertData = {
      id: uuidv4(),
      admin_id: data.admin_id,
      purpose: data.purpose,
      token_hash: data.token_hash,
      delivery_email: data.delivery_email,
      requested_by_admin_id: data.requested_by_admin_id ?? null,
      expires_at: data.expires_at,
      used_at: data.used_at ?? null,
    };
    const { columns, values, placeholders } = buildInsertParts(insertData);

    const { rows } = await executor(
      `
        INSERT INTO password_action_tokens (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${PASSWORD_ACTION_TOKEN_SELECT}
      `,
      values,
    );

    return rows[0] ?? null;
  },

  // Busca un token activo por hash.
  // Si forUpdate=true, bloquea la fila para evitar que dos requests
  // completen el mismo enlace al mismo tiempo.
  async findActiveByTokenHash(tokenHash, options = {}, executor = query) {
    const forUpdateClause = options.forUpdate ? 'FOR UPDATE' : '';

    const { rows } = await executor(
      `
        SELECT ${PASSWORD_ACTION_TOKEN_SELECT}
        FROM password_action_tokens
        WHERE token_hash = $1
          AND used_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
        ${forUpdateClause}
      `,
      [tokenHash],
    );

    return rows[0] ?? null;
  },

  // Invalida todos los enlaces pendientes del admin.
  // Esto nos deja con una sola "llave viva" por usuario.
  async markAllActiveAsUsedByAdminId(adminId, executor = query) {
    await executor(
      `
        UPDATE password_action_tokens
        SET used_at = COALESCE(used_at, NOW())
        WHERE admin_id = $1
          AND used_at IS NULL
      `,
      [adminId],
    );
  },

  async countActiveByAdminId(adminId, executor = query) {
    const where = buildWhereEqualsClause({ admin_id: adminId });

    const { rows } = await executor(
      `
        SELECT COUNT(*)::INT AS total
        FROM password_action_tokens
        WHERE ${where.clause}
          AND used_at IS NULL
          AND expires_at > NOW()
      `,
      where.values,
    );

    return rows[0]?.total ?? 0;
  },
};

export default PasswordActionToken;
