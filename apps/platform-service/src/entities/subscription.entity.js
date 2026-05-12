import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';

const SUBSCRIPTION_SELECT = `
  id,
  system_id,
  plan_code,
  status,
  next_renewal_at,
  grace_days,
  last_paid_at,
  starts_at,
  ends_at,
  created_at,
  updated_at
`;

const PlatformSubscription = {
  async upsertSystemSubscription(data, executor = query) {
    const { rows } = await executor(
      `
        INSERT INTO platform_system_subscriptions (
          id,
          system_id,
          plan_code,
          status,
          next_renewal_at,
          grace_days,
          last_paid_at,
          starts_at,
          ends_at
        )
        VALUES ($1, $2, $3, 'active', $4, $5, $6, NOW(), NULL)
        ON CONFLICT (system_id)
        DO UPDATE SET
          plan_code = EXCLUDED.plan_code,
          status = 'active',
          next_renewal_at = EXCLUDED.next_renewal_at,
          grace_days = EXCLUDED.grace_days,
          last_paid_at = COALESCE(EXCLUDED.last_paid_at, platform_system_subscriptions.last_paid_at),
          starts_at = COALESCE(platform_system_subscriptions.starts_at, NOW()),
          ends_at = NULL,
          updated_at = NOW()
        RETURNING ${SUBSCRIPTION_SELECT}
      `,
      [
        uuidv4(),
        data.system_id,
        data.plan_code,
        data.next_renewal_at,
        data.grace_days ?? 5,
        data.last_paid_at ?? null,
      ],
    );

    return rows[0];
  },

  async findCurrentBySystemId(systemId, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${SUBSCRIPTION_SELECT}
        FROM platform_system_subscriptions
        WHERE system_id = $1
          AND status <> 'canceled'
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 1
      `,
      [systemId],
    );

    return rows[0] ?? null;
  },

  async updateStatus(id, status, executor = query) {
    const { rows } = await executor(
      `
        UPDATE platform_system_subscriptions
        SET status = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING ${SUBSCRIPTION_SELECT}
      `,
      [status, id],
    );

    return rows[0] ?? null;
  },

  async markAsPaid(data, executor = query) {
    const { rows } = await executor(
      `
        UPDATE platform_system_subscriptions
        SET status = 'active',
            last_paid_at = $2,
            next_renewal_at = $3,
            grace_days = $4,
            updated_at = NOW()
        WHERE id = $1
        RETURNING ${SUBSCRIPTION_SELECT}
      `,
      [
        data.subscription_id,
        data.last_paid_at,
        data.next_renewal_at,
        data.grace_days ?? 5,
      ],
    );

    return rows[0] ?? null;
  },
};

export default PlatformSubscription;
