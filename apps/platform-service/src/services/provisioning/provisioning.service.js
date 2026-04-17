import db from '../../config/db/db.js';
import System from '../../entities/system.entity.js';
import SystemProvisioningRun from '../../entities/system-provisioning-run.entity.js';
import { createHttpError } from '../../utils/errors/app-error.util.js';
import { trimBoundaryWhitespace } from '../../utils/normalizers/string-normalizer.util.js';

function normalizeOptionalString(value) {
  const normalizedValue = trimBoundaryWhitespace(value);
  return normalizedValue || null;
}

function normalizeProvisionPayload(payload) {
  return {
    admin_panel_url: normalizeOptionalString(payload.admin_panel_url),
    public_site_url: normalizeOptionalString(payload.public_site_url),
    catalog_base_url: normalizeOptionalString(payload.catalog_base_url),
    identity_base_url: normalizeOptionalString(payload.identity_base_url),
    database_name: normalizeOptionalString(payload.database_name),
    owner_email: normalizeOptionalString(payload.owner_email)?.toLowerCase() ?? null,
  };
}

class ProvisioningService {
  async createProvisioningRun(systemId, payload) {
    const system = await System.findByPk(systemId);

    if (!system) {
      throw createHttpError(404, 'System not found.', 'SYSTEM_NOT_FOUND');
    }

    if (system.status === 'archived') {
      throw createHttpError(409, 'Archived systems cannot be provisioned.', 'SYSTEM_ARCHIVED_CANNOT_PROVISION');
    }

    const normalizedPayload = normalizeProvisionPayload(payload);

    const completedRun = await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);

      await System.update(systemId, {
        status: 'provisioning',
      }, executor);

      const run = await SystemProvisioningRun.create({
        system_id: systemId,
        status: 'running',
        ...normalizedPayload,
      }, executor);

      const finalizedRun = await SystemProvisioningRun.update(run.id, {
        status: 'completed',
        completed_at: new Date(),
        ...normalizedPayload,
      }, executor);

      await System.update(systemId, {
        status: 'active',
        admin_panel_url: normalizedPayload.admin_panel_url ?? system.admin_panel_url,
        public_site_url: normalizedPayload.public_site_url ?? system.public_site_url,
      }, executor);

      return finalizedRun;
    });

    return completedRun;
  }

  async getProvisioningRuns(systemId) {
    const system = await System.findByPk(systemId);

    if (!system) {
      throw createHttpError(404, 'System not found.', 'SYSTEM_NOT_FOUND');
    }

    return await SystemProvisioningRun.findAllBySystemId(systemId);
  }

  async getProvisioningRunById(systemId, runId) {
    const run = await SystemProvisioningRun.findByIdAndSystemId(runId, systemId);

    if (!run) {
      throw createHttpError(404, 'Provisioning run not found.', 'SYSTEM_PROVISIONING_RUN_NOT_FOUND');
    }

    return run;
  }
}

export default new ProvisioningService();
