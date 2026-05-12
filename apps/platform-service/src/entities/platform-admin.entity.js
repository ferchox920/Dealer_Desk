import { v4 as uuidv4 } from 'uuid';
import { SUPER_ADMIN_ROLE } from '../constants/platform-roles.js';
import { query } from '../config/db/db.js';
import {
  attachRecordMethods,
  buildInsertParts,
  buildUpdateSetClause,
  buildWhereEqualsClause,
} from './helpers.entity.js';

const PLATFORM_ADMIN_SELECT = `
  id,
  name,
  email,
  password_hash,
  role,
  is_active,
  last_login_at,
  created_at,
  updated_at
`;

const MUTABLE_FIELDS = ['name', 'email', 'password_hash', 'role', 'is_active', 'last_login_at'];

function hydratePlatformAdmin(row, executor = query) {
  if (!row) {
    return null;
  }

  return attachRecordMethods(row, {
    update: async (data) => PlatformAdmin.update(row.id, data, executor),
  });
}

const PlatformAdmin = {
  async create(data, executor = query) {
    const insertData = {
      id: uuidv4(),
      name: data.name,
      email: data.email,
      password_hash: data.password_hash,
      role: data.role ?? SUPER_ADMIN_ROLE,
      is_active: data.is_active ?? true,
      last_login_at: data.last_login_at ?? null,
    };
    const { columns, values, placeholders } = buildInsertParts(insertData);

    const { rows } = await executor(
      `
        INSERT INTO platform_admins (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${PLATFORM_ADMIN_SELECT}
      `,
      values,
    );

    return hydratePlatformAdmin(rows[0], executor);
  },

  async findByPk(id, executor = query) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await executor(
      `
        SELECT ${PLATFORM_ADMIN_SELECT}
        FROM platform_admins
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    return hydratePlatformAdmin(rows[0], executor);
  },

  async findOneByEmail(email, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${PLATFORM_ADMIN_SELECT}
        FROM platform_admins
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email],
    );

    return hydratePlatformAdmin(rows[0], executor);
  },

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
        UPDATE platform_admins
        SET ${set.clause}, updated_at = NOW()
        WHERE ${where.clause}
        RETURNING ${PLATFORM_ADMIN_SELECT}
      `,
      [...set.values, ...where.values],
    );

    return hydratePlatformAdmin(rows[0], executor);
  },
};

export default PlatformAdmin;
