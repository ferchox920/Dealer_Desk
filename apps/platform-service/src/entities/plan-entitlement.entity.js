import { query } from '../config/db/db.js';

const PLAN_ENTITLEMENT_SELECT = `
  plan_code,
  publication_limit,
  user_limit,
  created_at,
  updated_at
`;

const PlatformPlanEntitlement = {
  async findByPlanCode(planCode, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${PLAN_ENTITLEMENT_SELECT}
        FROM platform_plan_entitlements
        WHERE plan_code = $1
        LIMIT 1
      `,
      [planCode],
    );

    return rows[0] ?? null;
  },
};

export default PlatformPlanEntitlement;
