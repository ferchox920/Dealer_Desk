import { v4 as uuidv4 } from 'uuid';
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

const MUTABLE_FIELDS = [
  'name',
  'password_hash',
  'role',
  'is_active',
  'last_login_at',
];

function hydratePlatformAdmin(row) {
  if (!row) {
    return null;
  }

  return attachRecordMethods(row, {
    update: async (data) => PlatformAdmin.update(row.id, data),
  });
}

const PlatformAdmin = {
  async create(data) {
    const insertData = {
      id: uuidv4(),
      name: data.name,
      email: data.email,
      password_hash: data.password_hash,
      role: data.role,
      is_active: data.is_active ?? true,
      last_login_at: data.last_login_at ?? null,
    };
    const { columns, values, placeholders } = buildInsertParts(insertData);

    const { rows } = await query(
      `
        INSERT INTO platform_admins (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${PLATFORM_ADMIN_SELECT}
      `,
      values,
    );

    return hydratePlatformAdmin(rows[0]);
  },

  async findByPk(id) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await query(
      `
        SELECT ${PLATFORM_ADMIN_SELECT}
        FROM platform_admins
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    return hydratePlatformAdmin(rows[0]);
  },

  async findOneByEmail(email) {
    const where = buildWhereEqualsClause({ email });

    const { rows } = await query(
      `
        SELECT ${PLATFORM_ADMIN_SELECT}
        FROM platform_admins
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    return hydratePlatformAdmin(rows[0]);
  },

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
        UPDATE platform_admins
        SET ${set.clause}, updated_at = NOW()
        WHERE ${where.clause}
        RETURNING ${PLATFORM_ADMIN_SELECT}
      `,
      [...set.values, ...where.values],
    );

    return hydratePlatformAdmin(rows[0]);
  },
};

export default PlatformAdmin;
