import pg from 'pg';
import { v2 as cloudinary } from 'cloudinary';
import db from '../../config/db/db.js';
import PlatformAddon from '../../entities/addon.entity.js';
import PlatformCurrency from '../../entities/currency.entity.js';
import PlatformLocation from '../../entities/location.entity.js';
import PlatformSubscriptionAddon from '../../entities/subscription-addon.entity.js';
import PlatformSubscription from '../../entities/subscription.entity.js';
import PlatformSystemCloudinaryCredential from '../../entities/system-cloudinary-credential.entity.js';
import PlatformSystemCurrency from '../../entities/system-currency.entity.js';
import PlatformSystemDatabaseCredential from '../../entities/system-database-credential.entity.js';
import PlatformSystemEvent from '../../entities/system-event.entity.js';
import PlatformSystemToken from '../../entities/system-token.entity.js';
import PlatformSystem from '../../entities/system.entity.js';
import { createHttpError } from '../../utils/errors/app-error.util.js';
import { trimBoundaryWhitespace } from '../../utils/normalizers/string-normalizer.util.js';
import {
  encryptSecret,
  hashSecret,
} from '../../utils/security/secret-crypto.util.js';
import platformBillingService from '../billing/billing.service.js';

const { Pool } = pg;
const ACTIVE_STATUS = 'active';
const SUSPENDED_STATUS = 'suspended';
const ARCHIVED_STATUS = 'archived';
const DRAFT_STATUS = 'draft';

function normalizeName(name) {
  return trimBoundaryWhitespace(name);
}

function normalizeNullableString(value) {
  const trimmedValue = trimBoundaryWhitespace(value);

  if (typeof trimmedValue !== 'string' || trimmedValue.length === 0) {
    return null;
  }

  return trimmedValue;
}

function normalizeSlug(slug) {
  return trimBoundaryWhitespace(slug).toLowerCase();
}

function normalizeCurrencyCodes(currencyCodes = []) {
  return [...new Set(currencyCodes.map((code) => trimBoundaryWhitespace(code).toUpperCase()))];
}

function normalizePlanCode(planCode) {
  return trimBoundaryWhitespace(planCode).toLowerCase();
}

function normalizeIsoDate(value, field, code) {
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

function normalizeAddonCode(addonCode) {
  return trimBoundaryWhitespace(addonCode).toLowerCase();
}

function normalizeAddonItems(addons = []) {
  if (!Array.isArray(addons)) {
    return [];
  }

  const normalizedItems = addons
    .filter((addon) => addon && typeof addon === 'object')
    .map((addon) => ({
      addon_code: normalizeAddonCode(addon.addon_code),
      quantity: addon.quantity ?? 1,
    }));

  const groupedItems = new Map();

  for (const addon of normalizedItems) {
    const previousItem = groupedItems.get(addon.addon_code);

    if (!previousItem) {
      groupedItems.set(addon.addon_code, {
        addon_code: addon.addon_code,
        quantity: addon.quantity,
      });
      continue;
    }

    groupedItems.set(addon.addon_code, {
      addon_code: addon.addon_code,
      quantity: previousItem.quantity + addon.quantity,
    });
  }

  return [...groupedItems.values()];
}

async function ensureSystemExists(systemId) {
  const system = await PlatformSystem.findByPk(systemId);

  if (!system) {
    throw createHttpError(404, 'System not found.', 'PLATFORM_SYSTEM_NOT_FOUND');
  }

  return system;
}

async function ensureAddonsAreUsable(addons) {
  const normalizedAddons = normalizeAddonItems(addons);

  for (const addon of normalizedAddons) {
    const existingAddon = await PlatformAddon.findByCode(addon.addon_code);

    if (!existingAddon || !existingAddon.is_active) {
      throw createHttpError(
        400,
        `Platform add-on ${addon.addon_code} not found or inactive.`,
        'PLATFORM_ADDON_NOT_FOUND',
      );
    }

    if (!Number.isInteger(addon.quantity) || addon.quantity < 1) {
      throw createHttpError(
        400,
        `The quantity for add-on ${addon.addon_code} must be a positive integer.`,
        'PLATFORM_ADDON_QUANTITY_INVALID',
      );
    }
  }

  return normalizedAddons;
}

async function ensureLocationIsUsable(locationId) {
  const location = await PlatformLocation.findByPk(locationId);

  if (!location || !location.is_active) {
    throw createHttpError(400, 'Platform location not found or inactive.', 'PLATFORM_LOCATION_NOT_FOUND');
  }

  return location;
}

async function ensureCurrenciesAreUsable(currencyCodes, defaultCurrencyCode) {
  const safeCurrencyCodes = normalizeCurrencyCodes(currencyCodes);
  const safeDefaultCurrencyCode = trimBoundaryWhitespace(defaultCurrencyCode).toUpperCase();

  if (safeCurrencyCodes.length === 0) {
    throw createHttpError(400, 'At least one currency is required.', 'SYSTEM_CURRENCIES_REQUIRED');
  }

  if (!safeCurrencyCodes.includes(safeDefaultCurrencyCode)) {
    throw createHttpError(
      400,
      'The default currency must be included in the system currencies.',
      'SYSTEM_DEFAULT_CURRENCY_REQUIRED',
    );
  }

  const existingCurrencies = await PlatformCurrency.findActiveByCodes(safeCurrencyCodes);
  const existingCodes = new Set(existingCurrencies.map((currency) => currency.code));
  const missingCodes = safeCurrencyCodes.filter((code) => !existingCodes.has(code));

  if (missingCodes.length > 0) {
    throw createHttpError(
      400,
      `Invalid or inactive currencies: ${missingCodes.join(', ')}.`,
      'SYSTEM_CURRENCY_INVALID',
    );
  }

  return {
    currencyCodes: safeCurrencyCodes,
    defaultCurrencyCode: safeDefaultCurrencyCode,
  };
}

async function validateDatabaseConnection(connectionString) {
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    await pool.query('SELECT 1');
  } catch (error) {
    throw createHttpError(
      400,
      `Database credentials are not valid or reachable: ${error.message}`,
      'SYSTEM_DATABASE_CREDENTIALS_INVALID',
    );
  } finally {
    await pool.end().catch(() => null);
  }
}

async function validateCloudinaryCredentials({ cloudName, apiKey, apiSecret }) {
  const previousConfig = cloudinary.config();

  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    await cloudinary.api.ping();
  } catch (error) {
    throw createHttpError(
      400,
      `Cloudinary credentials are not valid or reachable: ${error.message}`,
      'SYSTEM_CLOUDINARY_CREDENTIALS_INVALID',
    );
  } finally {
    cloudinary.config(previousConfig);
  }
}

function buildCloudinaryFingerprint({ cloudName, apiKey, apiSecret }) {
  return `${cloudName}:${apiKey}:${apiSecret}`;
}

function assertSystemCanActivate(system, entitlements) {
  if (!system.location) {
    throw createHttpError(400, 'System location is required.', 'SYSTEM_LOCATION_REQUIRED');
  }

  if (!Array.isArray(system.currencies) || system.currencies.length === 0) {
    throw createHttpError(400, 'System currencies are required.', 'SYSTEM_CURRENCIES_REQUIRED');
  }

  if (!system.currencies.some((currency) => currency.is_default === true)) {
    throw createHttpError(400, 'System default currency is required.', 'SYSTEM_DEFAULT_CURRENCY_REQUIRED');
  }

  if (!system.subscription) {
    throw createHttpError(400, 'System plan is required.', 'SYSTEM_PLAN_REQUIRED');
  }

  if (entitlements.subscription?.status !== 'active') {
    throw createHttpError(400, 'System subscription must be active before activation.', 'SYSTEM_SUBSCRIPTION_NOT_ACTIVE');
  }

  if (!entitlements || entitlements.publication_limit < 1 || entitlements.user_limit < 1) {
    throw createHttpError(400, 'System limits are not calculable.', 'SYSTEM_LIMITS_REQUIRED');
  }

  if (!system.has_database_credentials) {
    throw createHttpError(400, 'System database credentials are required.', 'SYSTEM_DATABASE_CREDENTIALS_REQUIRED');
  }

  if (!system.has_cloudinary_credentials) {
    throw createHttpError(400, 'System Cloudinary credentials are required.', 'SYSTEM_CLOUDINARY_CREDENTIALS_REQUIRED');
  }

  if (!system.has_system_token) {
    throw createHttpError(400, 'System technical token is required.', 'SYSTEM_TECHNICAL_TOKEN_REQUIRED');
  }
}

class SystemService {
  async getAll() {
    return await PlatformSystem.findAll({ includeDetails: true });
  }

  async getById(id) {
    const system = await PlatformSystem.findByPk(id, { includeDetails: true });

    if (!system) {
      throw createHttpError(404, 'System not found.', 'PLATFORM_SYSTEM_NOT_FOUND');
    }

    return system;
  }

  async create(data) {
    const normalizedName = normalizeName(data.name);
    const normalizedSlug = normalizeSlug(data.slug);
    const normalizedPlanCode = normalizePlanCode(data.plan_code);
    const normalizedRenewalAt = normalizeIsoDate(
      data.next_renewal_at,
      'next_renewal_at',
      'PLATFORM_SUBSCRIPTION_NEXT_RENEWAL_AT_INVALID',
    );
    const graceDays = normalizeGraceDays(data.grace_days);
    const normalizedAddons = await ensureAddonsAreUsable(data.addons);
    const existingSystem = await PlatformSystem.findOneBySlug(normalizedSlug);

    if (existingSystem) {
      throw createHttpError(409, 'System slug already exists.', 'PLATFORM_SYSTEM_SLUG_ALREADY_EXISTS');
    }

    await ensureLocationIsUsable(data.location_id);
    await platformBillingService.ensurePlanIsUsable(normalizedPlanCode);
    const currencyConfig = await ensureCurrenciesAreUsable(data.currency_codes, data.default_currency_code);

    const createdSystemPayload = await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const system = await PlatformSystem.create(
        {
          name: normalizedName,
          slug: normalizedSlug,
          status: DRAFT_STATUS,
          location_id: data.location_id,
          admin_panel_url: normalizeNullableString(data.admin_panel_url),
          public_site_url: normalizeNullableString(data.public_site_url),
          custom_domain: normalizeNullableString(data.custom_domain),
          default_subdomain: normalizeNullableString(data.default_subdomain),
        },
        executor,
      );

      await PlatformSystemCurrency.replaceForSystem(
        system.id,
        currencyConfig.currencyCodes,
        currencyConfig.defaultCurrencyCode,
        executor,
      );

      await PlatformSubscription.upsertSystemSubscription(
        {
          system_id: system.id,
          plan_code: normalizedPlanCode,
          next_renewal_at: normalizedRenewalAt,
          grace_days: graceDays,
        },
        executor,
      );

      const subscription = await PlatformSubscription.findCurrentBySystemId(system.id, executor);

      if (!subscription) {
        throw createHttpError(400, 'System subscription could not be created.', 'PLATFORM_SUBSCRIPTION_REQUIRED');
      }

      for (const addon of normalizedAddons) {
        await PlatformSubscriptionAddon.upsert(
          {
            subscription_id: subscription.id,
            addon_code: addon.addon_code,
            quantity: addon.quantity,
          },
          executor,
        );
      }

      const technicalToken = await PlatformSystemToken.createOrRotate(system.id, executor);

      await PlatformSystemEvent.create(
        {
          system_id: system.id,
          event_type: 'system_created',
          message: 'System was created in draft status.',
          metadata: {
            plan_code: normalizedPlanCode,
            next_renewal_at: normalizedRenewalAt,
            grace_days: graceDays,
            currency_codes: currencyConfig.currencyCodes,
            default_currency_code: currencyConfig.defaultCurrencyCode,
            addons: normalizedAddons,
          },
        },
        executor,
      );

      await PlatformSystemEvent.create(
        {
          system_id: system.id,
          event_type: 'system_token_rotated',
          message: 'Technical token was created for the system.',
        },
        executor,
      );

      return {
        system_id: system.id,
        technical_token: technicalToken.plainToken,
      };
    });

    const system = await this.getById(createdSystemPayload.system_id);

    return {
      ...system,
      technical_token: createdSystemPayload.technical_token,
    };
  }

  async update(id, data) {
    const system = await ensureSystemExists(id);
    const updateData = {};

    if (data.location_id !== undefined) {
      await ensureLocationIsUsable(data.location_id);
      updateData.location_id = data.location_id;
    }

    if (data.name !== undefined) {
      updateData.name = normalizeName(data.name);
    }

    if (data.admin_panel_url !== undefined) {
      updateData.admin_panel_url = normalizeNullableString(data.admin_panel_url);
    }

    if (data.public_site_url !== undefined) {
      updateData.public_site_url = normalizeNullableString(data.public_site_url);
    }

    if (data.custom_domain !== undefined) {
      updateData.custom_domain = normalizeNullableString(data.custom_domain);
    }

    if (data.default_subdomain !== undefined) {
      updateData.default_subdomain = normalizeNullableString(data.default_subdomain);
    }

    await system.update(updateData);

    await PlatformSystemEvent.create({
      system_id: id,
      event_type: 'system_updated',
      message: 'System details were updated.',
      metadata: { fields: Object.keys(updateData) },
    });

    return await this.getById(id);
  }

  async setDatabaseCredentials(id, data) {
    await ensureSystemExists(id);
    const connectionString = trimBoundaryWhitespace(data.connection_string);

    await validateDatabaseConnection(connectionString);

    await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      await PlatformSystemDatabaseCredential.upsert(
        {
          system_id: id,
          encrypted_connection_string: encryptSecret(connectionString),
          connection_hash: hashSecret(connectionString),
        },
        executor,
      );

      await PlatformSystemEvent.create(
        {
          system_id: id,
          event_type: 'database_credentials_updated',
          message: 'System database credentials were validated and stored.',
        },
        executor,
      );
    });

    return await this.getById(id);
  }

  async setCloudinaryCredentials(id, data) {
    await ensureSystemExists(id);
    const credentials = {
      cloudName: trimBoundaryWhitespace(data.cloud_name),
      apiKey: trimBoundaryWhitespace(data.api_key),
      apiSecret: trimBoundaryWhitespace(data.api_secret),
    };

    await validateCloudinaryCredentials(credentials);

    await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      await PlatformSystemCloudinaryCredential.upsert(
        {
          system_id: id,
          encrypted_cloud_name: encryptSecret(credentials.cloudName),
          encrypted_api_key: encryptSecret(credentials.apiKey),
          encrypted_api_secret: encryptSecret(credentials.apiSecret),
          credentials_hash: hashSecret(buildCloudinaryFingerprint(credentials)),
        },
        executor,
      );

      await PlatformSystemEvent.create(
        {
          system_id: id,
          event_type: 'cloudinary_credentials_updated',
          message: 'System Cloudinary credentials were validated and stored.',
        },
        executor,
      );
    });

    return await this.getById(id);
  }

  async activate(id) {
    const system = await this.getById(id);
    const entitlements = await platformBillingService.getSystemEntitlements(id);

    assertSystemCanActivate(system, entitlements);

    const updatedSystem = await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const activatedSystem = await PlatformSystem.updateStatus(id, ACTIVE_STATUS, executor);

      await PlatformSystemEvent.create(
        {
          system_id: id,
          event_type: 'system_activated',
          message: 'System was activated.',
          metadata: {
            publication_limit: entitlements.publication_limit,
            user_limit: entitlements.user_limit,
          },
        },
        executor,
      );

      return activatedSystem;
    });

    return await this.getById(updatedSystem.id);
  }

  async suspend(id) {
    await ensureSystemExists(id);
    const updatedSystem = await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const suspendedSystem = await PlatformSystem.updateStatus(id, SUSPENDED_STATUS, executor);

      await PlatformSystemEvent.create(
        {
          system_id: id,
          event_type: 'system_suspended',
          message: 'System was suspended.',
        },
        executor,
      );

      return suspendedSystem;
    });

    return await this.getById(updatedSystem.id);
  }

  async archive(id) {
    await ensureSystemExists(id);
    const updatedSystem = await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const archivedSystem = await PlatformSystem.updateStatus(id, ARCHIVED_STATUS, executor);

      await PlatformSystemEvent.create(
        {
          system_id: id,
          event_type: 'system_archived',
          message: 'System was archived.',
        },
        executor,
      );

      return archivedSystem;
    });

    return await this.getById(updatedSystem.id);
  }

  async rotateTechnicalToken(id) {
    await ensureSystemExists(id);

    const technicalToken = await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const createdToken = await PlatformSystemToken.createOrRotate(id, executor);

      await PlatformSystemEvent.create(
        {
          system_id: id,
          event_type: 'system_token_rotated',
          message: 'Technical token was rotated for the system.',
        },
        executor,
      );

      return createdToken;
    });

    return {
      system: await this.getById(id),
      technical_token: technicalToken.plainToken,
    };
  }

  async getRuntime(id) {
    return await platformBillingService.getSystemRuntimeSnapshot(id);
  }

  async getRuntimeStatus(id) {
    const runtime = await platformBillingService.getSystemRuntimeSnapshot(id);

    return {
      system_id: runtime.system_id,
      system_slug: runtime.system_slug,
      system_status: runtime.system_status,
      subscription_status: runtime.subscription_status,
      next_renewal_at: runtime.next_renewal_at,
      grace_days: runtime.grace_days,
      last_paid_at: runtime.last_paid_at,
      is_runtime_enabled: runtime.is_runtime_enabled,
    };
  }

  async getRuntimeLimits(id) {
    const runtime = await platformBillingService.getSystemRuntimeSnapshot(id);

    return {
      system_id: runtime.system_id,
      system_slug: runtime.system_slug,
      system_status: runtime.system_status,
      subscription_status: runtime.subscription_status,
      publication_limit: runtime.entitlements.publication_limit,
      user_limit: runtime.entitlements.user_limit,
      base_publication_limit: runtime.entitlements.base_publication_limit ?? 0,
      base_user_limit: runtime.entitlements.base_user_limit ?? 0,
      addons: runtime.entitlements.addons,
      currencies: runtime.currencies,
    };
  }
}

export default new SystemService();
