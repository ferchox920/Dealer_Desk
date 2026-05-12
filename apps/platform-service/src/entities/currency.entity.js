import { query } from '../config/db/db.js';

const CURRENCY_SELECT = `
  code,
  name,
  symbol,
  is_active,
  is_product_currency,
  created_at,
  updated_at
`;

const PlatformCurrency = {
  async findAll(filters = {}, executor = query) {
    const values = [];
    const conditions = [];

    if (filters.is_active !== undefined) {
      values.push(filters.is_active);
      conditions.push(`is_active = $${values.length}`);
    }

    if (filters.is_product_currency !== undefined) {
      values.push(filters.is_product_currency);
      conditions.push(`is_product_currency = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await executor(
      `
        SELECT ${CURRENCY_SELECT}
        FROM platform_currencies
        ${whereClause}
        ORDER BY code ASC
      `,
      values,
    );

    return rows;
  },

  async findActiveByCodes(codes, executor = query) {
    if (!Array.isArray(codes) || codes.length === 0) {
      return [];
    }

    const { rows } = await executor(
      `
        SELECT ${CURRENCY_SELECT}
        FROM platform_currencies
        WHERE code = ANY($1::varchar[])
          AND is_active = TRUE
          AND is_product_currency = TRUE
      `,
      [codes],
    );

    return rows;
  },
};

export default PlatformCurrency;
