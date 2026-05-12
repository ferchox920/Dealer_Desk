import { query } from '../config/db/db.js';

const SYSTEM_CURRENCY_SELECT = `
  sc.system_id,
  sc.currency_code,
  sc.is_default,
  c.name,
  c.symbol,
  c.is_product_currency
`;

const PlatformSystemCurrency = {
  async findBySystemId(systemId, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${SYSTEM_CURRENCY_SELECT}
        FROM platform_system_currencies AS sc
        INNER JOIN platform_currencies AS c ON c.code = sc.currency_code
        WHERE sc.system_id = $1
        ORDER BY sc.is_default DESC, sc.currency_code ASC
      `,
      [systemId],
    );

    return rows;
  },

  async replaceForSystem(systemId, currencyCodes, defaultCurrencyCode, executor = query) {
    await executor('DELETE FROM platform_system_currencies WHERE system_id = $1', [systemId]);

    for (const currencyCode of currencyCodes) {
      await executor(
        `
          INSERT INTO platform_system_currencies (
            system_id, currency_code, is_default
          )
          VALUES ($1, $2, $3)
        `,
        [
          systemId,
          currencyCode,
          currencyCode === defaultCurrencyCode,
        ],
      );
    }

    return await this.findBySystemId(systemId, executor);
  },
};

export default PlatformSystemCurrency;
