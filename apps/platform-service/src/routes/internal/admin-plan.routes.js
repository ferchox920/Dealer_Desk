import express from 'express';
import internalAdminPlanService from '../../services/internal/admin-plan.service.js';
import { validateSystemId } from '../../utils/validations/systems/system.validation.js';

const internalAdminPlanRoutes = express.Router();

function sendPlanError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
  });
}

internalAdminPlanRoutes.get('/internal/admin-plans/catalog', async (_req, res) => {
  try {
    const catalog = await internalAdminPlanService.getCatalog();
    return res.status(200).json({ status: 200, data: catalog });
  } catch (error) {
    return sendPlanError(res, error);
  }
});

internalAdminPlanRoutes.get('/internal/admin-plans/current/:id', validateSystemId, async (req, res) => {
  try {
    const summary = await internalAdminPlanService.getCurrentPlanSummary(req.params.id);
    return res.status(200).json({ status: 200, data: summary });
  } catch (error) {
    return sendPlanError(res, error);
  }
});

export default internalAdminPlanRoutes;
