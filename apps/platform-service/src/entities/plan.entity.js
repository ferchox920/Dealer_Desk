import { query } from '../config/db/db.js';
import PlatformPlanEntitlement from './plan-entitlement.entity.js';
import PlatformPlanPrice from './plan-price.entity.js';

const PLAN_SELECT = `
  code,
  name,
  description,
  is_active,
  created_at,
  updated_at
`;

const PlatformPlan = {
  async findAll(options = {}, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${PLAN_SELECT}
        FROM platform_plans
        WHERE ($1::boolean IS NULL OR is_active = $1)
        ORDER BY created_at ASC
      `,
      [options.is_active ?? null],
    );

    if (!options.includeDetails) {
      return rows;
    }

    return await Promise.all(rows.map(async (plan) => ({
      ...plan,
      prices: await PlatformPlanPrice.findByPlanCode(plan.code, executor),
      entitlements: await PlatformPlanEntitlement.findByPlanCode(plan.code, executor),
    })));
  },

  async findByCode(code, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${PLAN_SELECT}
        FROM platform_plans
        WHERE code = $1
        LIMIT 1
      `,
      [code],
    );

    return rows[0] ?? null;
  },
};

export default PlatformPlan;
