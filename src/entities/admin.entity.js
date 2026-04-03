// ============================================================================
// admin.entity.js
//
// Acceso SQL para la tabla "admins". Maneja usuarios administrativos.
// Sigue el mismo patrón que product.entity.js:
//   - ADMIN_SELECT: columnas que se devuelven
//   - MUTABLE_FIELDS: campos editables
//   - hydrateAdmin: adjunta .update() y .destroy()
//   - Métodos CRUD con queries parametrizadas
//
// Hoy es base para autenticación futura.
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';
import {
  attachRecordMethods,
  buildInsertParts,
  buildUpdateSetClause,
  buildWhereEqualsClause,
} from './helpers.entity.js';

const ADMIN_SELECT = `
  id,
  email,
  password_hash,
  role,
  is_active,
  created_at,
  updated_at
`;

const MUTABLE_FIELDS = ['email', 'password_hash', 'role', 'is_active'];

function hydrateAdmin(row) {
  if (!row) return null;

  return attachRecordMethods(row, {
    update: async (data) => Admin.update(row.id, data),
    destroy: async () => Admin.deleteById(row.id),
  });
}

const Admin = {
  // Crea un admin nuevo.
  // SQL: INSERT INTO admins (id, email, ...) VALUES ($1, $2, ...) RETURNING ...
  async create(data) {
    const insertData = {
      id: uuidv4(),
      email: data.email,
      password_hash: data.password_hash,
      role: data.role,
      is_active: data.is_active ?? true,
    };
    const { columns, values, placeholders } = buildInsertParts(insertData);

    const { rows } = await query(
      `
        INSERT INTO admins (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${ADMIN_SELECT}
      `,
      values,
    );

    return hydrateAdmin(rows[0]);
  },

  // Busca un admin por UUID.
  // SQL: SELECT ... FROM admins WHERE id = $1 LIMIT 1
  async findByPk(id) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await query(
      `
        SELECT ${ADMIN_SELECT}
        FROM admins
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    return hydrateAdmin(rows[0]);
  },

  // Busca un admin por email (para login futuro).
  // SQL: SELECT ... FROM admins WHERE email = $1 LIMIT 1
  async findOneByEmail(email) {
    const where = buildWhereEqualsClause({ email });

    const { rows } = await query(
      `
        SELECT ${ADMIN_SELECT}
        FROM admins
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    return hydrateAdmin(rows[0]);
  },

  // Actualiza campos editables de un admin.
  // SQL: UPDATE admins SET email = $1, ..., updated_at = NOW() WHERE id = $2 RETURNING ...
  async update(id, data) {
    const fields = MUTABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(data, field));

    if (fields.length === 0) {
      return await this.findByPk(id);
    }

    const set = buildUpdateSetClause(
      Object.fromEntries(fields.map((field) => [field, data[field]])),
      1,
    );
    const where = buildWhereEqualsClause({ id }, set.values.length + 1);

    const { rows } = await query(
      `
        UPDATE admins
        SET ${set.clause}, updated_at = NOW()
        WHERE ${where.clause}
        RETURNING ${ADMIN_SELECT}
      `,
      [...set.values, ...where.values],
    );

    return hydrateAdmin(rows[0]);
  },

  // Elimina un admin por UUID.
  // SQL: DELETE FROM admins WHERE id = $1 RETURNING ...
  async deleteById(id) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await query(
      `
        DELETE FROM admins
        WHERE ${where.clause}
        RETURNING ${ADMIN_SELECT}
      `,
      where.values,
    );

    return hydrateAdmin(rows[0]);
  },
};

export default Admin;
