import PlatformPlanPrice from '../../entities/plan-price.entity.js';
import PlatformPlan from '../../entities/plan.entity.js';
import { createHttpError } from '../../utils/errors/app-error.util.js';
import platformCatalogService from '../catalogs/catalog.service.js';
import platformBillingService from '../billing/billing.service.js';

function buildPricePayload(price) {
  if (!price) {
    return null;
  }

  return {
    amount: Number(price.amount ?? price.price_amount ?? 0),
    currencyCode: price.currency_code ?? price.price_currency_code ?? null,
    billingPeriod: price.billing_period ?? 'monthly',
  };
}

function pickPrimaryPrice(prices = []) {
  if (!Array.isArray(prices) || prices.length === 0) {
    return null;
  }

  const monthlyPrice = prices.find((price) => price.billing_period === 'monthly');
  return monthlyPrice ?? prices[0];
}

function mapCatalogPlan(plan) {
  return {
    code: plan?.code ?? null,
    name: plan?.name ?? 'Plan',
    description: plan?.description ?? '',
    highlight: '',
    price: buildPricePayload(pickPrimaryPrice(plan?.prices)),
    limits: {
      activeProperties: Number(plan?.entitlements?.publication_limit ?? 0),
      activeUsers: Number(plan?.entitlements?.user_limit ?? 0),
      inactiveProperties: 25,
      inactiveUsers: 5,
    },
    supportsAddons: true,
  };
}

function mapCatalogAddon(addon) {
  return {
    code: addon?.code ?? null,
    name: addon?.name ?? 'Addon',
    description: addon?.description ?? '',
    type: addon?.addon_type === 'publication_pack'
      ? 'active_properties'
      : addon?.addon_type === 'user_pack'
        ? 'active_users'
        : 'unknown',
    quantity: Number(addon?.quantity ?? 0),
    price: buildPricePayload(addon),
    renewsWithPlan: true,
  };
}

class InternalAdminPlanService {
  async getCatalog() {
    const [plans, addons] = await Promise.all([
      platformCatalogService.getPlans(),
      platformCatalogService.getAddons(),
    ]);

    return {
      plans: plans.map((plan) => mapCatalogPlan(plan)),
      addons: addons.map((addon) => mapCatalogAddon(addon)),
    };
  }

  async getCurrentPlanSummary(systemId) {
    const runtime = await platformBillingService.getSystemRuntimeSnapshot(systemId);

    if (!runtime) {
      throw createHttpError(
        503,
        'Platform runtime is not available for this system.',
        'PLATFORM_PLAN_RUNTIME_UNAVAILABLE',
      );
    }

    const planCode = runtime.entitlements?.subscription?.plan_code ?? null;
    const planRecord = planCode ? await PlatformPlan.findByCode(planCode) : null;
    const planPrices = planCode ? await PlatformPlanPrice.findByPlanCode(planCode) : [];

    return {
      currentPlan: {
        code: planCode,
        name: planRecord?.name ?? 'Plan actual',
        price: buildPricePayload(pickPrimaryPrice(planPrices)),
        renewalDate: runtime.next_renewal_at ?? null,
        status: runtime.subscription_status ?? null,
      },
      baseLimits: {
        activeProperties: Number(runtime.entitlements?.base_publication_limit ?? 0),
        activeUsers: Number(runtime.entitlements?.base_user_limit ?? 0),
        inactiveProperties: 25,
        inactiveUsers: 5,
      },
      addons: (runtime.entitlements?.addons ?? []).map((addon) => {
        const totalExtraCapacity = Number(addon.unit_quantity ?? 0) * Number(addon.quantity ?? 0);

        return {
          code: addon.addon_code,
          name: addon.name ?? addon.addon_code,
          quantity: Number(addon.quantity ?? 0),
          unitPrice: buildPricePayload({
            amount: addon.price_amount,
            billing_period: addon.billing_period,
            currency_code: addon.price_currency_code,
          }),
          totalExtraCapacity,
          type: addon.addon_type === 'publication_pack'
            ? 'active_properties'
            : addon.addon_type === 'user_pack'
              ? 'active_users'
              : 'unknown',
        };
      }),
      totals: {
        allowedActiveProperties: Number(runtime.entitlements?.publication_limit ?? 0),
        allowedActiveUsers: Number(runtime.entitlements?.user_limit ?? 0),
        allowedInactiveProperties: 25,
        allowedInactiveUsers: 5,
      },
    };
  }
}

export default new InternalAdminPlanService();
