// ============================================================================
// admin.entity.js
//
// Acceso SQL para la tabla "admins". Mantiene el mismo estilo que el resto
// del proyecto: queries parametrizadas, hydrate con .update()/.destroy() y
// una interfaz chica y predecible.
//
// Acepta un executor opcional (por defecto query) para poder reutilizar la
// misma entidad dentro de transacciones con client.query.bind(client).
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { OWNER_ROLE } from '../constants/admin-roles.js';
import { query } from '../config/db/db.js';
import {
  attachRecordMethods,
  buildInsertParts,
  buildUpdateSetClause,
  buildWhereEqualsClause,
} from './helpers.entity.js';

const ADMIN_SELECT = `
  id,
  name,
  email,
  password_hash,
  role,
  is_active,
  last_login_at,
  created_by_admin_id,
  created_at,
  updated_at
`;

const MUTABLE_FIELDS = ['name', 'email', 'password_hash', 'role', 'is_active', 'last_login_at'];

function hydrateAdmin(row, executor = query) {
  if (!row) {
    return null;
  }

  return attachRecordMethods(row, {
    update: async (data) => Admin.update(row.id, data, executor),
    destroy: async () => Admin.deleteById(row.id, executor),
  });
}

const Admin = {
  // Crea un admin nuevo y devuelve el registro completo.
  async create(data, executor = query) {
    const insertData = {
      id: uuidv4(),
      name: data.name ?? null,
      email: data.email,
      password_hash: data.password_hash ?? null,
      role: data.role,
      is_active: data.is_active ?? true,
      last_login_at: data.last_login_at ?? null,
      created_by_admin_id: data.created_by_admin_id ?? null,
    };
    const { columns, values, placeholders } = buildInsertParts(insertData);

    const { rows } = await executor(
      `
        INSERT INTO admins (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${ADMIN_SELECT}
      `,
      values,
    );

    return hydrateAdmin(rows[0], executor);
  },

  // Busca un admin por UUID.
  async findByPk(id, executor = query) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await executor(
      `
        SELECT ${ADMIN_SELECT}
        FROM admins
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    return hydrateAdmin(rows[0], executor);
  },

  // Busca un admin por email en forma case-insensitive.
  async findOneByEmail(email, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${ADMIN_SELECT}
        FROM admins
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email],
    );

    return hydrateAdmin(rows[0], executor);
  },

  // Lista admins con filtros simples.
  async findAll(filters = {}, executor = query) {
    const where = buildWhereEqualsClause({
      role: filters.role,
      is_active: filters.is_active,
    });
    const whereClause = where.clause ? `WHERE ${where.clause}` : '';

    const { rows } = await executor(
      `
        SELECT ${ADMIN_SELECT}
        FROM admins
        ${whereClause}
        ORDER BY created_at DESC
      `,
      where.values,
    );

    return rows.map((row) => hydrateAdmin(row, executor));
  },

  // Cuenta owners activos para no dejar el sistema sin un responsable.
  async countActiveOwners(options = {}, executor = query) {
    const values = [OWNER_ROLE, true];
    let whereClause = 'role = $1 AND is_active = $2';

    if (options.excludeId) {
      values.push(options.excludeId);
      whereClause += ` AND id <> $${values.length}`;
    }

    const { rows } = await executor(
      `
        SELECT COUNT(*)::INT AS total
        FROM admins
        WHERE ${whereClause}
      `,
      values,
    );

    return rows[0]?.total ?? 0;
  },

  // Actualiza solo campos permitidos y refresca updated_at.
  async update(id, data, executor = query) {
    const fields = MUTABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(data, field));

    if (fields.length === 0) {
      return await this.findByPk(id, executor);
    }

    const set = buildUpdateSetClause(
      Object.fromEntries(fields.map((field) => [field, data[field]])),
      1,
    );
    const where = buildWhereEqualsClause({ id }, set.values.length + 1);

    const { rows } = await executor(
      `
        UPDATE admins
        SET ${set.clause}, updated_at = NOW()
        WHERE ${where.clause}
        RETURNING ${ADMIN_SELECT}
      `,
      [...set.values, ...where.values],
    );

    return hydrateAdmin(rows[0], executor);
  },

  // Elimina un admin por UUID.
  async deleteById(id, executor = query) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await executor(
      `
        DELETE FROM admins
        WHERE ${where.clause}
        RETURNING ${ADMIN_SELECT}
      `,
      where.values,
    );

    return hydrateAdmin(rows[0], executor);
  },
};

export default Admin;
