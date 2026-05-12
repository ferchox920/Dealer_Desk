import db from '../../config/db/db.js';
import PlatformAddon from '../../entities/addon.entity.js';
import PlatformPlanEntitlement from '../../entities/plan-entitlement.entity.js';
import PlatformPlan from '../../entities/plan.entity.js';
import PlatformSubscriptionAddon from '../../entities/subscription-addon.entity.js';
import PlatformSubscription from '../../entities/subscription.entity.js';
import PlatformSystemEvent from '../../entities/system-event.entity.js';
import PlatformSystem from '../../entities/system.entity.js';
import { createHttpError } from '../../utils/errors/app-error.util.js';
import { trimBoundaryWhitespace } from '../../utils/normalizers/string-normalizer.util.js';

function normalizePlanCode(planCode) {
  return trimBoundaryWhitespace(planCode).toLowerCase();
}

function normalizeAddonCode(addonCode) {
  return trimBoundaryWhitespace(addonCode).toLowerCase();
}

function normalizeIsoDate(value, {
  field = 'date',
  code = 'PLATFORM_DATE_INVALID',
} = {}) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw createHttpError(400, `The ${field} must be a valid ISO date.`, code);
  }

  return parsedDate.toISOString();
}

function normalizeGraceDays(value) {
  if (value === undefined || value === null) {
    return 5;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw createHttpError(400, 'The grace_days must be a positive integer or zero.', 'PLATFORM_GRACE_DAYS_INVALID');
  }

  return value;
}

function deriveSubscriptionStatus(subscription) {
  if (!subscription) {
    return null;
  }

  if (subscription.status === 'canceled') {
    return 'canceled';
  }

  const renewalDate = new Date(subscription.next_renewal_at);
  const graceDays = Number(subscription.grace_days ?? 5);
  const graceLimitDate = new Date(renewalDate);
  graceLimitDate.setUTCDate(graceLimitDate.getUTCDate() + graceDays);
  const now = new Date();

  if (now > graceLimitDate) {
    return 'expired';
  }

  if (now > renewalDate) {
    return 'past_due';
  }

  return 'active';
}

function buildEmptyEntitlements(systemId) {
  return {
    system_id: systemId,
    subscription: null,
    addons: [],
    base_publication_limit: 0,
    base_user_limit: 0,
    publication_limit: 0,
    user_limit: 0,
  };
}

class PlatformBillingService {
  async syncDerivedSubscriptionStatus(subscription, executor = db.query.bind(db)) {
    if (!subscription) {
      return null;
    }

    const derivedStatus = deriveSubscriptionStatus(subscription);

    if (!derivedStatus || derivedStatus === subscription.status) {
      return {
        ...subscription,
        status: derivedStatus ?? subscription.status,
      };
    }

    return await PlatformSubscription.updateStatus(subscription.id, derivedStatus, executor);
  }

  async ensurePlanIsUsable(planCode) {
    const normalizedPlanCode = normalizePlanCode(planCode);
    const plan = await PlatformPlan.findByCode(normalizedPlanCode);

    if (!plan || !plan.is_active) {
      throw createHttpError(400, 'Platform plan not found or inactive.', 'PLATFORM_PLAN_NOT_FOUND');
    }

    const entitlements = await PlatformPlanEntitlement.findByPlanCode(normalizedPlanCode);

    if (!entitlements) {
      throw createHttpError(400, 'Platform plan has no entitlements configured.', 'PLATFORM_PLAN_ENTITLEMENTS_REQUIRED');
    }

    return {
      plan,
      entitlements,
    };
  }

  async setSystemSubscription(systemId, data) {
    const system = await PlatformSystem.findByPk(systemId);

    if (!system) {
      throw createHttpError(404, 'System not found.', 'PLATFORM_SYSTEM_NOT_FOUND');
    }

    const normalizedPlanCode = normalizePlanCode(data.plan_code);
    const normalizedRenewalAt = normalizeIsoDate(data.next_renewal_at, {
      field: 'next_renewal_at',
      code: 'PLATFORM_SUBSCRIPTION_NEXT_RENEWAL_AT_INVALID',
    });
    const graceDays = normalizeGraceDays(data.grace_days);
    await this.ensurePlanIsUsable(normalizedPlanCode);

    return await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const createdSubscription = await PlatformSubscription.upsertSystemSubscription(
        {
          system_id: systemId,
          plan_code: normalizedPlanCode,
          next_renewal_at: normalizedRenewalAt,
          grace_days: graceDays,
        },
        executor,
      );

      await PlatformSystemEvent.create(
        {
          system_id: systemId,
          event_type: 'subscription_updated',
          message: `System subscription set to ${normalizedPlanCode}.`,
          metadata: {
            plan_code: normalizedPlanCode,
            next_renewal_at: normalizedRenewalAt,
            grace_days: graceDays,
          },
        },
        executor,
      );

      return createdSubscription;
    });
  }

  async addSystemAddon(systemId, addonCode, quantity = 1) {
    const subscription = await PlatformSubscription.findCurrentBySystemId(systemId);

    if (!subscription) {
      throw createHttpError(400, 'System requires an active subscription before adding add-ons.', 'PLATFORM_SUBSCRIPTION_REQUIRED');
    }

    const normalizedAddonCode = normalizeAddonCode(addonCode);
    const addon = await PlatformAddon.findByCode(normalizedAddonCode);

    if (!addon || !addon.is_active) {
      throw createHttpError(400, 'Platform add-on not found or inactive.', 'PLATFORM_ADDON_NOT_FOUND');
    }

    const safeQuantity = quantity ?? 1;

    return await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const createdAddon = await PlatformSubscriptionAddon.upsert(
        {
          subscription_id: subscription.id,
          addon_code: normalizedAddonCode,
          quantity: safeQuantity,
        },
        executor,
      );

      await PlatformSystemEvent.create(
        {
          system_id: systemId,
          event_type: 'addon_updated',
          message: `System add-on ${normalizedAddonCode} set to quantity ${safeQuantity}.`,
          metadata: {
            addon_code: normalizedAddonCode,
            quantity: safeQuantity,
          },
        },
        executor,
      );

      return createdAddon;
    });
  }

  async removeSystemAddon(systemId, addonId) {
    const subscription = await PlatformSubscription.findCurrentBySystemId(systemId);

    if (!subscription) {
      throw createHttpError(400, 'System has no active subscription.', 'PLATFORM_SUBSCRIPTION_REQUIRED');
    }

    return await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const removedAddon = await PlatformSubscriptionAddon.cancel(subscription.id, addonId, executor);

      if (!removedAddon) {
        throw createHttpError(404, 'System add-on not found.', 'PLATFORM_SYSTEM_ADDON_NOT_FOUND');
      }

      await PlatformSystemEvent.create(
        {
          system_id: systemId,
          event_type: 'addon_removed',
          message: `System add-on ${removedAddon.addon_code} was removed.`,
          metadata: {
            addon_id: addonId,
            addon_code: removedAddon.addon_code,
          },
        },
        executor,
      );

      return removedAddon;
    });
  }

  async getSystemEntitlements(systemId) {
    const system = await PlatformSystem.findByPk(systemId);

    if (!system) {
      throw createHttpError(404, 'System not found.', 'PLATFORM_SYSTEM_NOT_FOUND');
    }

    const currentSubscription = await PlatformSubscription.findCurrentBySystemId(systemId);

    if (!currentSubscription) {
      return buildEmptyEntitlements(systemId);
    }

    const subscription = await this.syncDerivedSubscriptionStatus(currentSubscription);
    const planEntitlements = await PlatformPlanEntitlement.findByPlanCode(subscription.plan_code);

    if (!planEntitlements) {
      throw createHttpError(400, 'Platform plan has no entitlements configured.', 'PLATFORM_PLAN_ENTITLEMENTS_REQUIRED');
    }

    const addons = await PlatformSubscriptionAddon.findActiveBySubscriptionId(subscription.id);
    let publicationLimit = planEntitlements.publication_limit;
    let userLimit = planEntitlements.user_limit;

    for (const addon of addons) {
      const addonTotal = addon.unit_quantity * addon.quantity;

      if (addon.addon_type === 'publication_pack') {
        publicationLimit += addonTotal;
      }

      if (addon.addon_type === 'user_pack') {
        userLimit += addonTotal;
      }
    }

    return {
      system_id: systemId,
      subscription,
      addons,
      base_publication_limit: planEntitlements.publication_limit,
      base_user_limit: planEntitlements.user_limit,
      publication_limit: publicationLimit,
      user_limit: userLimit,
    };
  }

  async recordSystemPayment(systemId, data) {
    const system = await PlatformSystem.findByPk(systemId);

    if (!system) {
      throw createHttpError(404, 'System not found.', 'PLATFORM_SYSTEM_NOT_FOUND');
    }

    const subscription = await PlatformSubscription.findCurrentBySystemId(systemId);

    if (!subscription) {
      throw createHttpError(400, 'System has no subscription to mark as paid.', 'PLATFORM_SUBSCRIPTION_REQUIRED');
    }

    const paidAt = normalizeIsoDate(data.paid_at, {
      field: 'paid_at',
      code: 'PLATFORM_PAYMENT_PAID_AT_INVALID',
    });
    const nextRenewalAt = normalizeIsoDate(data.next_renewal_at, {
      field: 'next_renewal_at',
      code: 'PLATFORM_PAYMENT_NEXT_RENEWAL_AT_INVALID',
    });
    const graceDays = normalizeGraceDays(data.grace_days ?? subscription.grace_days);

    return await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const updatedSubscription = await PlatformSubscription.markAsPaid(
        {
          subscription_id: subscription.id,
          last_paid_at: paidAt,
          next_renewal_at: nextRenewalAt,
          grace_days: graceDays,
        },
        executor,
      );

      await PlatformSystemEvent.create(
        {
          system_id: systemId,
          event_type: 'payment_recorded',
          message: 'Manual payment was recorded for the system subscription.',
          metadata: {
            paid_at: paidAt,
            next_renewal_at: nextRenewalAt,
            grace_days: graceDays,
          },
        },
        executor,
      );

      return updatedSubscription;
    });
  }

  async getSystemRuntimeSnapshot(systemId) {
    const system = await PlatformSystem.findByPk(systemId, { includeDetails: true });

    if (!system) {
      throw createHttpError(404, 'System not found.', 'PLATFORM_SYSTEM_NOT_FOUND');
    }

    const entitlements = await this.getSystemEntitlements(systemId);
    const subscriptionStatus = entitlements.subscription?.status ?? null;
    const isRuntimeEnabled = system.status === 'active'
      && (subscriptionStatus === 'active' || subscriptionStatus === 'past_due');

    return {
      system_id: system.id,
      system_slug: system.slug,
      system_status: system.status,
      subscription_status: subscriptionStatus,
      next_renewal_at: entitlements.subscription?.next_renewal_at ?? null,
      grace_days: entitlements.subscription?.grace_days ?? null,
      last_paid_at: entitlements.subscription?.last_paid_at ?? null,
      is_runtime_enabled: isRuntimeEnabled,
      currencies: system.currencies,
      entitlements,
    };
  }
}

export default new PlatformBillingService();
