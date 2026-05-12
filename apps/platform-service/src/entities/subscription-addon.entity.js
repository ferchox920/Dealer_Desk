import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';

const SUBSCRIPTION_ADDON_SELECT = `
  id,
  subscription_id,
  addon_code,
  quantity,
  status,
  created_at,
  updated_at
`;

const SUBSCRIPTION_ADDON_WITH_CATALOG_SELECT = `
  subscription_addon.id,
  subscription_addon.subscription_id,
  subscription_addon.addon_code,
  subscription_addon.quantity,
  subscription_addon.status,
  subscription_addon.created_at,
  subscription_addon.updated_at,
  addon.name,
  addon.addon_type,
  addon.quantity AS unit_quantity,
  addon.price_currency_code,
  addon.price_amount,
  addon.billing_period
`;

const PlatformSubscriptionAddon = {
  async upsert(data, executor = query) {
    const { rows } = await executor(
      `
        INSERT INTO platform_system_subscription_addons (
          id, subscription_id, addon_code, quantity, status
        )
        VALUES ($1, $2, $3, $4, 'active')
        ON CONFLICT (subscription_id, addon_code)
        DO UPDATE SET
          quantity = EXCLUDED.quantity,
          status = 'active',
          updated_at = NOW()
        RETURNING ${SUBSCRIPTION_ADDON_SELECT}
      `,
      [
        uuidv4(),
        data.subscription_id,
        data.addon_code,
        data.quantity ?? 1,
      ],
    );

    return rows[0];
  },

  async cancel(subscriptionId, addonId, executor = query) {
    const { rows } = await executor(
      `
        UPDATE platform_system_subscription_addons
        SET status = 'canceled',
            updated_at = NOW()
        WHERE subscription_id = $1
          AND id = $2
        RETURNING ${SUBSCRIPTION_ADDON_SELECT}
      `,
      [subscriptionId, addonId],
    );

    return rows[0] ?? null;
  },

  async findActiveBySubscriptionId(subscriptionId, executor = query) {
    const { rows } = await executor(
      `
        SELECT
          ${SUBSCRIPTION_ADDON_WITH_CATALOG_SELECT}
        FROM platform_system_subscription_addons AS subscription_addon
        INNER JOIN platform_addons AS addon ON addon.code = subscription_addon.addon_code
        WHERE subscription_addon.subscription_id = $1
          AND subscription_addon.status = 'active'
        ORDER BY addon.addon_type ASC, addon.quantity ASC
      `,
      [subscriptionId],
    );

    return rows;
  },
};

export default PlatformSubscriptionAddon;
