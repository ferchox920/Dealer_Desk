import express from 'express';
import { SUPER_ADMIN_ROLE } from '../../constants/platform-roles.js';
import { authorizeRoles } from '../../middlewares/auth/authorize-roles.js';
import { requireAuth } from '../../middlewares/auth/require-auth.js';
import platformCatalogService from '../../services/catalogs/catalog.service.js';

const catalogRoutes = express.Router();

function sendCatalogError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
  });
}

function requirePlatformSuperAdmin(req, res, next) {
  return requireAuth(req, res, () => authorizeRoles(SUPER_ADMIN_ROLE)(req, res, next));
}

catalogRoutes.get('/locations', requirePlatformSuperAdmin, async (_req, res) => {
  try {
    const locations = await platformCatalogService.getLocations();
    return res.status(200).json({ status: 200, data: locations });
  } catch (error) {
    return sendCatalogError(res, error);
  }
});

catalogRoutes.get('/currencies', requirePlatformSuperAdmin, async (_req, res) => {
  try {
    const currencies = await platformCatalogService.getCurrencies();
    return res.status(200).json({ status: 200, data: currencies });
  } catch (error) {
    return sendCatalogError(res, error);
  }
});

catalogRoutes.get('/plans', requirePlatformSuperAdmin, async (_req, res) => {
  try {
    const plans = await platformCatalogService.getPlans();
    return res.status(200).json({ status: 200, data: plans });
  } catch (error) {
    return sendCatalogError(res, error);
  }
});

catalogRoutes.get('/addons', requirePlatformSuperAdmin, async (_req, res) => {
  try {
    const addons = await platformCatalogService.getAddons();
    return res.status(200).json({ status: 200, data: addons });
  } catch (error) {
    return sendCatalogError(res, error);
  }
});

export default catalogRoutes;
