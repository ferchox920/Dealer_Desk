import express from 'express';
import { SUPER_ADMIN_ROLE } from '../../constants/platform-roles.js';
import { authorizeRoles } from '../../middlewares/auth/authorize-roles.js';
import { requireAuth } from '../../middlewares/auth/require-auth.js';
import platformBillingService from '../../services/billing/billing.service.js';
import provisioningService from '../../services/provisioning/provisioning.service.js';
import systemService from '../../services/systems/system.service.js';
import {
  validateAddon,
  validateAddonId,
  validateCloudinaryCredentials,
  validateCreateSystem,
  validateDatabaseCredentials,
  validateProvisioningRunId,
  validateProvisionSystem,
  validateRecordPayment,
  validateSubscription,
  validateSystemId,
  validateUpdateSystem,
} from '../../utils/validations/systems/system.validation.js';

const systemRoutes = express.Router();

function sendSystemError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
  });
}

function requirePlatformSuperAdmin(req, res, next) {
  return requireAuth(req, res, () => authorizeRoles(SUPER_ADMIN_ROLE)(req, res, next));
}

systemRoutes.get('/systems', requirePlatformSuperAdmin, async (_req, res) => {
  try {
    const systems = await systemService.getAll();
    return res.status(200).json({ status: 200, data: systems });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.get('/systems/:id', validateSystemId, requirePlatformSuperAdmin, async (req, res) => {
  try {
    const system = await systemService.getById(req.params.id);
    return res.status(200).json({ status: 200, data: system });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.post('/systems', requirePlatformSuperAdmin, validateCreateSystem, async (req, res) => {
  try {
    const system = await systemService.create(req.body);
    return res.status(201).json({ status: 201, data: system });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.patch('/systems/:id', validateSystemId, requirePlatformSuperAdmin, validateUpdateSystem, async (req, res) => {
  try {
    const system = await systemService.update(req.params.id, req.body);
    return res.status(200).json({ status: 200, data: system });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.post('/systems/:id/database-credentials', validateSystemId, requirePlatformSuperAdmin, validateDatabaseCredentials, async (req, res) => {
  try {
    const system = await systemService.setDatabaseCredentials(req.params.id, req.body);
    return res.status(200).json({ status: 200, data: system });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.post('/systems/:id/cloudinary-credentials', validateSystemId, requirePlatformSuperAdmin, validateCloudinaryCredentials, async (req, res) => {
  try {
    const system = await systemService.setCloudinaryCredentials(req.params.id, req.body);
    return res.status(200).json({ status: 200, data: system });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.post('/systems/:id/activate', validateSystemId, requirePlatformSuperAdmin, async (req, res) => {
  try {
    const system = await systemService.activate(req.params.id);
    return res.status(200).json({ status: 200, data: system });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.post('/systems/:id/suspend', validateSystemId, requirePlatformSuperAdmin, async (req, res) => {
  try {
    const system = await systemService.suspend(req.params.id);
    return res.status(200).json({ status: 200, data: system });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.post('/systems/:id/archive', validateSystemId, requirePlatformSuperAdmin, async (req, res) => {
  try {
    const system = await systemService.archive(req.params.id);
    return res.status(200).json({ status: 200, data: system });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.post('/systems/:id/subscription', validateSystemId, requirePlatformSuperAdmin, validateSubscription, async (req, res) => {
  try {
    const subscription = await platformBillingService.setSystemSubscription(req.params.id, req.body);
    return res.status(200).json({ status: 200, data: subscription });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.post('/systems/:id/addons', validateSystemId, requirePlatformSuperAdmin, validateAddon, async (req, res) => {
  try {
    const addon = await platformBillingService.addSystemAddon(
      req.params.id,
      req.body.addon_code,
      req.body.quantity,
    );
    return res.status(201).json({ status: 201, data: addon });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.delete('/systems/:id/addons/:addonId', validateSystemId, requirePlatformSuperAdmin, validateAddonId, async (req, res) => {
  try {
    const addon = await platformBillingService.removeSystemAddon(req.params.id, req.params.addonId);
    return res.status(200).json({ status: 200, data: addon });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.get('/systems/:id/entitlements', validateSystemId, requirePlatformSuperAdmin, async (req, res) => {
  try {
    const entitlements = await platformBillingService.getSystemEntitlements(req.params.id);
    return res.status(200).json({ status: 200, data: entitlements });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.post('/systems/:id/payments/record', validateSystemId, requirePlatformSuperAdmin, validateRecordPayment, async (req, res) => {
  try {
    const subscription = await platformBillingService.recordSystemPayment(req.params.id, req.body);
    return res.status(200).json({ status: 200, data: subscription });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.post('/systems/:id/technical-token/rotate', validateSystemId, requirePlatformSuperAdmin, async (req, res) => {
  try {
    const token = await systemService.rotateTechnicalToken(req.params.id);
    return res.status(200).json({ status: 200, data: token });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.post('/systems/:id/provision', validateSystemId, requirePlatformSuperAdmin, validateProvisionSystem, async (req, res) => {
  try {
    const provisioningRun = await provisioningService.createProvisioningRun(req.params.id, req.body);
    return res.status(201).json({ status: 201, data: provisioningRun });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.get('/systems/:id/provisioning-runs', validateSystemId, requirePlatformSuperAdmin, async (req, res) => {
  try {
    const provisioningRuns = await provisioningService.getProvisioningRuns(req.params.id);
    return res.status(200).json({ status: 200, data: provisioningRuns });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.get('/systems/:id/provisioning-runs/:runId', validateSystemId, requirePlatformSuperAdmin, validateProvisioningRunId, async (req, res) => {
  try {
    const provisioningRun = await provisioningService.getProvisioningRunById(req.params.id, req.params.runId);
    return res.status(200).json({ status: 200, data: provisioningRun });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

export default systemRoutes;
