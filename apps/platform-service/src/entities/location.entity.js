import { query } from '../config/db/db.js';

const LOCATION_SELECT = `
  id,
  country_code,
  country_name,
  region,
  city,
  timezone,
  is_active,
  created_at,
  updated_at
`;

const PlatformLocation = {
  async findAll(filters = {}, executor = query) {
    const values = [];
    const conditions = [];

    if (filters.is_active !== undefined) {
      values.push(filters.is_active);
      conditions.push(`is_active = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await executor(
      `
        SELECT ${LOCATION_SELECT}
        FROM platform_locations
        ${whereClause}
        ORDER BY country_name ASC, region ASC NULLS LAST, city ASC NULLS LAST
      `,
      values,
    );

    return rows;
  },

  async findByPk(id, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${LOCATION_SELECT}
        FROM platform_locations
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return rows[0] ?? null;
  },
};

export default PlatformLocation;
