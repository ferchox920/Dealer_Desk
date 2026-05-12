import { buildInternalServiceHeaders } from '@dealer-desk/shared-auth';
import {
  getCatalogServiceUrl,
  getPlatformServiceUrl,
} from '@dealer-desk/shared-config';
import Admin from '../../entities/admin.entity.js';
import {
  getAddonDefinition,
  getCapacityTypeFromAddonType,
  getPlanDefinition,
  INACTIVE_PROPERTIES_LIMIT,
  INACTIVE_USERS_LIMIT,
  PLATFORM_ADDON_DEFINITIONS,
  PLATFORM_PLAN_DEFINITIONS,
} from '../../constants/platform-billing.js';
import { createHttpError } from '../../utils/errors/app-error.util.js';
import { trimBoundaryWhitespace } from '../../utils/normalizers/string-normalizer.util.js';

const platformServiceUrl = getPlatformServiceUrl();
const catalogServiceUrl = getCatalogServiceUrl();

function isPlatformCatalogEnabled() {
  return process.env.PLATFORM_MODULE_ENABLED === 'true';
}

function getBoundRuntimeSystemId() {
  const systemId = trimBoundaryWhitespace(process.env.PLATFORM_RUNTIME_SYSTEM_ID);

  if (typeof systemId !== 'string' || systemId.length === 0) {
    return null;
  }

  return systemId;
}

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

function pickPrimaryPrice(prices = [], fallbackPrice = null) {
  if (Array.isArray(prices) && prices.length > 0) {
    const monthlyPrice = prices.find((price) => price.billing_period === 'monthly');
    return monthlyPrice ?? prices[0];
  }

  return fallbackPrice;
}

function mapCatalogPlan(plan, fallbackDefinition = null) {
  const definition = fallbackDefinition ?? getPlanDefinition(plan?.code);
  const entitlements = plan?.entitlements ?? {
    publication_limit: definition?.active_properties_limit ?? 0,
    user_limit: definition?.active_users_limit ?? 0,
  };

  return {
    code: plan?.code ?? definition?.code,
    name: definition?.name ?? plan?.name ?? 'Plan',
    description: definition?.description ?? plan?.description ?? '',
    highlight: definition?.highlight ?? '',
    price: buildPricePayload(pickPrimaryPrice(plan?.prices, definition?.price)),
    limits: {
      activeProperties: Number(entitlements.publication_limit ?? definition?.active_properties_limit ?? 0),
      activeUsers: Number(entitlements.user_limit ?? definition?.active_users_limit ?? 0),
      inactiveProperties: INACTIVE_PROPERTIES_LIMIT,
      inactiveUsers: INACTIVE_USERS_LIMIT,
    },
    supportsAddons: true,
  };
}

function mapCatalogAddon(addon, fallbackDefinition = null) {
  const definition = fallbackDefinition ?? getAddonDefinition(addon?.code);

  return {
    code: addon?.code ?? definition?.code,
    name: definition?.name ?? addon?.name ?? 'Addon',
    description: definition?.description ?? addon?.description ?? '',
    type: definition?.capacity_type ?? getCapacityTypeFromAddonType(addon?.addon_type),
    quantity: Number(addon?.quantity ?? definition?.quantity ?? 0),
    price: buildPricePayload({
      amount: addon?.price_amount ?? definition?.price?.amount,
      billing_period: addon?.billing_period ?? definition?.price?.billing_period,
      currency_code: addon?.price_currency_code ?? definition?.price?.currency_code,
    }),
    renewsWithPlan: true,
  };
}

function buildFallbackCatalog() {
  return {
    plans: PLATFORM_PLAN_DEFINITIONS.map((plan) => mapCatalogPlan(plan, plan)),
    addons: PLATFORM_ADDON_DEFINITIONS.map((addon) => mapCatalogAddon(addon, addon)),
  };
}

async function readInternalJson(response, fallbackCode) {
  let payload = null;

  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (response.ok) {
    return payload?.data ?? null;
  }

  throw createHttpError(
    response.status || 502,
    payload?.error || 'Platform integration request failed.',
    payload?.code || fallbackCode,
  );
}

async function fetchInternalJson(url, fallbackCode) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...buildInternalServiceHeaders(),
    },
    signal: AbortSignal.timeout(5000),
  });

  return await readInternalJson(response, fallbackCode);
}

class AdminPlanService {
  async getCatalog() {
    if (!isPlatformCatalogEnabled()) {
      return buildFallbackCatalog();
    }

    try {
      return await fetchInternalJson(
        `${platformServiceUrl}/internal/admin-plans/catalog`,
        'PLATFORM_PLAN_CATALOG_UNAVAILABLE',
      );
    } catch (_error) {
      return buildFallbackCatalog();
    }
  }

  async getCurrentPlan() {
    const systemId = getBoundRuntimeSystemId();

    if (!isPlatformCatalogEnabled() || !systemId) {
      throw createHttpError(
        503,
        'Mi plan todavia no esta disponible porque este sistema no esta vinculado al runtime comercial de plataforma.',
        'PLAN_RUNTIME_NOT_CONFIGURED',
      );
    }

    const [platformSummary, catalogUsage, activeUsers, inactiveUsers] = await Promise.all([
      fetchInternalJson(
        `${platformServiceUrl}/internal/admin-plans/current/${systemId}`,
        'PLATFORM_PLAN_SUMMARY_UNAVAILABLE',
      ),
      fetchInternalJson(
        `${catalogServiceUrl}/internal/plan-usage`,
        'CATALOG_PLAN_USAGE_UNAVAILABLE',
      ),
      Admin.countActive(),
      Admin.countInactive(),
    ]);

    return {
      ...platformSummary,
      usage: {
        activeProperties: Number(catalogUsage?.activeProperties ?? 0),
        inactiveProperties: Number(catalogUsage?.inactiveProperties ?? 0),
        activeUsers: Number(activeUsers ?? 0),
        inactiveUsers: Number(inactiveUsers ?? 0),
      },
    };
  }
}

export default new AdminPlanService();
