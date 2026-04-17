import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';
import {
  attachRecordMethods,
  buildInsertParts,
  buildUpdateSetClause,
  buildWhereEqualsClause,
} from './helpers.entity.js';

const SYSTEM_SELECT = `
  id,
  name,
  slug,
  status,
  plan_code,
  admin_panel_url,
  public_site_url,
  custom_domain,
  default_subdomain,
  country_code,
  timezone,
  created_at,
  updated_at
`;

const MUTABLE_FIELDS = [
  'name',
  'status',
  'plan_code',
  'admin_panel_url',
  'public_site_url',
  'custom_domain',
  'default_subdomain',
  'country_code',
  'timezone',
];

function hydrateSystem(row) {
  if (!row) {
    return null;
  }

  return attachRecordMethods(row, {
    update: async (data) => System.update(row.id, data),
  });
}

const System = {
  async create(data) {
    const insertData = {
      id: uuidv4(),
      name: data.name,
      slug: data.slug,
      status: data.status ?? 'draft',
      plan_code: data.plan_code ?? 'starter',
      admin_panel_url: data.admin_panel_url ?? null,
      public_site_url: data.public_site_url ?? null,
      custom_domain: data.custom_domain ?? null,
      default_subdomain: data.default_subdomain ?? null,
      country_code: data.country_code ?? null,
      timezone: data.timezone ?? null,
    };
    const { columns, values, placeholders } = buildInsertParts(insertData);

    const { rows } = await query(
      `
        INSERT INTO systems (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${SYSTEM_SELECT}
      `,
      values,
    );

    return hydrateSystem(rows[0]);
  },

  async findAll() {
    const { rows } = await query(`
      SELECT ${SYSTEM_SELECT}
      FROM systems
      ORDER BY created_at DESC
    `);

    return rows.map(hydrateSystem);
  },

  async findByPk(id) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await query(
      `
        SELECT ${SYSTEM_SELECT}
        FROM systems
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    return hydrateSystem(rows[0]);
  },

  async findOneBySlug(slug) {
    const where = buildWhereEqualsClause({ slug });

    const { rows } = await query(
      `
        SELECT ${SYSTEM_SELECT}
        FROM systems
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    return hydrateSystem(rows[0]);
  },

  async update(id, data, executor = query) {
    const fields = MUTABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(data, field));

    if (fields.length === 0) {
      return await this.findByPk(id);
    }

    const set = buildUpdateSetClause(
      Object.fromEntries(fields.map((field) => [field, data[field]])),
      1,
    );
    const where = buildWhereEqualsClause({ id }, set.values.length + 1);

    const { rows } = await executor(
      `
        UPDATE systems
        SET ${set.clause}, updated_at = NOW()
        WHERE ${where.clause}
        RETURNING ${SYSTEM_SELECT}
      `,
      [...set.values, ...where.values],
    );

    return hydrateSystem(rows[0]);
  },
};

export default System;
