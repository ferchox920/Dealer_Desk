import { query } from '../config/db/db.js';

const PLAN_PRICE_SELECT = `
  id,
  plan_code,
  currency_code,
  amount,
  billing_period,
  created_at,
  updated_at
`;

const PlatformPlanPrice = {
  async findByPlanCode(planCode, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${PLAN_PRICE_SELECT}
        FROM platform_plan_prices
        WHERE plan_code = $1
        ORDER BY billing_period ASC, currency_code ASC
      `,
      [planCode],
    );

    return rows;
  },
};

export default PlatformPlanPrice;
