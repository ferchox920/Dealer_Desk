import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';
import {
  attachRecordMethods,
  buildInsertParts,
  buildUpdateSetClause,
  buildWhereEqualsClause,
} from './helpers.entity.js';

const SYSTEM_PROVISIONING_RUN_SELECT = `
  id,
  system_id,
  status,
  started_at,
  completed_at,
  error_message,
  catalog_base_url,
  identity_base_url,
  database_name,
  owner_email,
  metadata,
  created_at,
  updated_at
`;

const MUTABLE_FIELDS = [
  'status',
  'completed_at',
  'error_message',
  'catalog_base_url',
  'identity_base_url',
  'database_name',
  'owner_email',
  'metadata',
];

function hydrateSystemProvisioningRun(row, executor = query) {
  if (!row) {
    return null;
  }

  return attachRecordMethods(row, {
    update: async (data, nestedExecutor = executor) => SystemProvisioningRun.update(row.id, data, nestedExecutor),
  });
}

const SystemProvisioningRun = {
  async create(data, executor = query) {
    const insertData = {
      id: uuidv4(),
      system_id: data.system_id,
      status: data.status,
      started_at: data.started_at ?? new Date(),
      completed_at: data.completed_at ?? null,
      error_message: data.error_message ?? null,
      catalog_base_url: data.catalog_base_url ?? null,
      identity_base_url: data.identity_base_url ?? null,
      database_name: data.database_name ?? null,
      owner_email: data.owner_email ?? null,
      metadata: JSON.stringify(data.metadata ?? {}),
    };
    const { columns, values, placeholders } = buildInsertParts(insertData);

    const { rows } = await executor(
      `
        INSERT INTO platform_system_provisioning_runs (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${SYSTEM_PROVISIONING_RUN_SELECT}
      `,
      values,
    );

    return hydrateSystemProvisioningRun(rows[0], executor);
  },

  async findAllBySystemId(systemId, executor = query) {
    const where = buildWhereEqualsClause({ system_id: systemId });

    const { rows } = await executor(
      `
        SELECT ${SYSTEM_PROVISIONING_RUN_SELECT}
        FROM platform_system_provisioning_runs
        WHERE ${where.clause}
        ORDER BY started_at DESC, created_at DESC
      `,
      where.values,
    );

    return rows.map((row) => hydrateSystemProvisioningRun(row, executor));
  },

  async findByPk(id, executor = query) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await executor(
      `
        SELECT ${SYSTEM_PROVISIONING_RUN_SELECT}
        FROM platform_system_provisioning_runs
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    return hydrateSystemProvisioningRun(rows[0], executor);
  },

  async findByIdAndSystemId(id, systemId, executor = query) {
    const where = buildWhereEqualsClause({ id, system_id: systemId });

    const { rows } = await executor(
      `
        SELECT ${SYSTEM_PROVISIONING_RUN_SELECT}
        FROM platform_system_provisioning_runs
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    return hydrateSystemProvisioningRun(rows[0], executor);
  },

  async update(id, data, executor = query) {
    const fields = MUTABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(data, field));

    if (fields.length === 0) {
      return await this.findByPk(id, executor);
    }

    const set = buildUpdateSetClause(
      Object.fromEntries(fields.map((field) => [field, data[field]])),
      1,
    );
    const where = buildWhereEqualsClause({ id }, set.values.length + 1);

    const { rows } = await executor(
      `
        UPDATE platform_system_provisioning_runs
        SET ${set.clause}, updated_at = NOW()
        WHERE ${where.clause}
        RETURNING ${SYSTEM_PROVISIONING_RUN_SELECT}
      `,
      [...set.values, ...where.values],
    );

    return hydrateSystemProvisioningRun(rows[0], executor);
  },
};

export default SystemProvisioningRun;
