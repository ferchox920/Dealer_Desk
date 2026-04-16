import express from 'express';
import { SUPER_ADMIN_ROLE } from '../../constants/platform-roles.js';
import { authorizeRoles } from '../../middlewares/auth/authorize-roles.js';
import { requireAuth } from '../../middlewares/auth/require-auth.js';
import systemService from '../../services/systems/system.service.js';
import {
  validateCreateSystem,
} from '../../utils/validations/systems/system.validation.js';

const systemRoutes = express.Router();

systemRoutes.use(requireAuth);
systemRoutes.use(authorizeRoles(SUPER_ADMIN_ROLE));

function sendSystemError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
  });
}

systemRoutes.get('/systems', async (_req, res) => {
  try {
    const systems = await systemService.getAll();

    return res.status(200).json({
      status: 200,
      data: systems,
    });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

systemRoutes.post('/systems', validateCreateSystem, async (req, res) => {
  try {
    const system = await systemService.create(req.body);

    return res.status(201).json({
      status: 201,
      data: system,
    });
  } catch (error) {
    return sendSystemError(res, error);
  }
});

export default systemRoutes;
