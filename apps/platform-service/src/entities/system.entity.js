import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';
import {
  attachRecordMethods,
  buildInsertParts,
  buildUpdateSetClause,
  buildWhereEqualsClause,
} from './helpers.entity.js';
import PlatformLocation from './location.entity.js';
import PlatformSystemCloudinaryCredential from './system-cloudinary-credential.entity.js';
import PlatformSystemCurrency from './system-currency.entity.js';
import PlatformSystemDatabaseCredential from './system-database-credential.entity.js';
import PlatformSystemToken from './system-token.entity.js';

const SYSTEM_SELECT = `
  id,
  name,
  slug,
  status,
  location_id,
  admin_panel_url,
  public_site_url,
  custom_domain,
  default_subdomain,
  created_at,
  updated_at
`;

const MUTABLE_FIELDS = [
  'name',
  'location_id',
  'admin_panel_url',
  'public_site_url',
  'custom_domain',
  'default_subdomain',
];

function hydrateSystem(row, executor = query) {
  if (!row) {
    return null;
  }

  return attachRecordMethods(row, {
    update: async (data) => PlatformSystem.update(row.id, data, executor),
  });
}

async function loadSystemSubscription(systemId, executor = query) {
  const { rows } = await executor(
    `
      SELECT
        subscription.id,
        subscription.system_id,
        subscription.plan_code,
        subscription.status,
        subscription.next_renewal_at,
        subscription.grace_days,
        subscription.last_paid_at,
        subscription.starts_at,
        subscription.ends_at,
        subscription.created_at,
        subscription.updated_at,
        plan.name AS plan_name
      FROM platform_system_subscriptions AS subscription
      INNER JOIN platform_plans AS plan ON plan.code = subscription.plan_code
      WHERE subscription.system_id = $1
      LIMIT 1
    `,
    [systemId],
  );

  return rows[0] ?? null;
}

async function addSystemDetails(system, executor = query) {
  if (!system) {
    return null;
  }

  const [
    location,
    currencies,
    subscription,
    hasDatabaseCredentials,
    hasCloudinaryCredentials,
    systemToken,
  ] = await Promise.all([
    PlatformLocation.findByPk(system.location_id, executor),
    PlatformSystemCurrency.findBySystemId(system.id, executor),
    loadSystemSubscription(system.id, executor),
    PlatformSystemDatabaseCredential.hasBySystemId(system.id, executor),
    PlatformSystemCloudinaryCredential.hasBySystemId(system.id, executor),
    PlatformSystemToken.findBySystemId(system.id, executor),
  ]);

  return {
    ...system,
    location,
    currencies,
    subscription,
    has_database_credentials: hasDatabaseCredentials,
    has_cloudinary_credentials: hasCloudinaryCredentials,
    has_system_token: systemToken?.is_active === true && !systemToken?.revoked_at,
    system_token_last_used_at: systemToken?.last_used_at ?? null,
  };
}

const PlatformSystem = {
  async create(data, executor = query) {
    const insertData = {
      id: uuidv4(),
      name: data.name,
      slug: data.slug,
      status: data.status ?? 'draft',
      location_id: data.location_id,
      admin_panel_url: data.admin_panel_url ?? null,
      public_site_url: data.public_site_url ?? null,
      custom_domain: data.custom_domain ?? null,
      default_subdomain: data.default_subdomain ?? null,
    };
    const { columns, values, placeholders } = buildInsertParts(insertData);

    const { rows } = await executor(
      `
        INSERT INTO platform_systems (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${SYSTEM_SELECT}
      `,
      values,
    );

    return hydrateSystem(rows[0], executor);
  },

  async findAll(options = {}, executor = query) {
    const { rows } = await executor(`
      SELECT ${SYSTEM_SELECT}
      FROM platform_systems
      ORDER BY created_at DESC
    `);

    const systems = rows.map((row) => hydrateSystem(row, executor));

    if (!options.includeDetails) {
      return systems;
    }

    return await Promise.all(systems.map((system) => addSystemDetails(system, executor)));
  },

  async findByPk(id, options = {}, executor = query) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await executor(
      `
        SELECT ${SYSTEM_SELECT}
        FROM platform_systems
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    const system = hydrateSystem(rows[0], executor);

    if (!options.includeDetails) {
      return system;
    }

    return await addSystemDetails(system, executor);
  },

  async findOneBySlug(slug, executor = query) {
    const { rows } = await executor(
      `
        SELECT ${SYSTEM_SELECT}
        FROM platform_systems
        WHERE slug = $1
        LIMIT 1
      `,
      [slug],
    );

    return hydrateSystem(rows[0], executor);
  },

  async update(id, data, executor = query) {
    const fields = MUTABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(data, field));

    if (fields.length === 0) {
      return await this.findByPk(id, {}, executor);
    }

    const set = buildUpdateSetClause(
      Object.fromEntries(fields.map((field) => [field, data[field]])),
      1,
    );
    const where = buildWhereEqualsClause({ id }, set.values.length + 1);

    const { rows } = await executor(
      `
        UPDATE platform_systems
        SET ${set.clause}, updated_at = NOW()
        WHERE ${where.clause}
        RETURNING ${SYSTEM_SELECT}
      `,
      [...set.values, ...where.values],
    );

    return hydrateSystem(rows[0], executor);
  },

  async updateStatus(id, status, executor = query) {
    const { rows } = await executor(
      `
        UPDATE platform_systems
        SET status = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING ${SYSTEM_SELECT}
      `,
      [status, id],
    );

    return hydrateSystem(rows[0], executor);
  },
};

export default PlatformSystem;
