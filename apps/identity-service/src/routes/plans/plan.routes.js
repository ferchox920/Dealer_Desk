import express from 'express';
import { OWNER_ROLE, STAFF_ROLE } from '../../constants/admin-roles.js';
import { requireAuth } from '../../middlewares/auth/require-auth.js';
import { authorizeRoles } from '../../middlewares/auth/authorize-roles.js';
import planService from '../../services/plans/plan.service.js';

const planRoutes = express.Router();

planRoutes.use(requireAuth);
planRoutes.use(authorizeRoles(OWNER_ROLE, STAFF_ROLE));

function sendPlanError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
  });
}

planRoutes.get('/catalog', async (_req, res) => {
  try {
    const catalog = await planService.getCatalog();

    return res.status(200).json({
      status: 200,
      data: catalog,
    });
  } catch (error) {
    return sendPlanError(res, error);
  }
});

planRoutes.get('/current', async (_req, res) => {
  try {
    const plan = await planService.getCurrentPlan();

    return res.status(200).json({
      status: 200,
      data: plan,
    });
  } catch (error) {
    return sendPlanError(res, error);
  }
});

export default planRoutes;
