import { query } from '../config/db/db.js';

const ADDON_SELECT = `
  code,
  name,
  description,
  addon_type,
  quantity,
  price_currency_code,
  price_amount,
  billing_period,
  is_active,
  created_at,
  updated_at
`;

const PlatformAddon = {
  async findAll(options = {}, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${ADDON_SELECT}
        FROM platform_addons
        WHERE ($1::boolean IS NULL OR is_active = $1)
        ORDER BY addon_type ASC, quantity ASC
      `,
      [options.is_active ?? null],
    );

    return rows;
  },

  async findByCode(code, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${ADDON_SELECT}
        FROM platform_addons
        WHERE code = $1
        LIMIT 1
      `,
      [code],
    );

    return rows[0] ?? null;
  },
};

export default PlatformAddon;
