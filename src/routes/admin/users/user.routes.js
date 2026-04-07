// ============================================================================
// user.routes.js
//
// Gestión de usuarios del panel. Solo owners pueden administrar owner/staff.
// ============================================================================

import express from 'express';
import { OWNER_ROLE } from '../../../constants/admin-roles.js';
import userService from '../../../services/admin/users/user.service.js';
import { requireAuth } from '../../../middlewares/auth/require-auth.js';
import { authorizeRoles } from '../../../middlewares/auth/authorize-roles.js';
import {
  validateCreateUser,
  validateUpdateUser,
  validateUserId,
} from '../../../utils/validations/admin/users/user.validation.js';

const userRoutes = express.Router();

userRoutes.use(requireAuth);
// Hoy solo owner puede crear/editar/eliminar usuarios del panel.
// Si mañana decides que manager también pueda hacerlo, el cambio natural
// sería ampliar esta lista de roles permitidos aquí.
userRoutes.use(authorizeRoles(OWNER_ROLE));

userRoutes.get('/', async (req, res) => {
  try {
    const users = await userService.list();

    return res.status(200).json({
      status: 200,
      data: users,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

userRoutes.get('/:id', validateUserId, async (req, res) => {
  try {
    const user = await userService.getById(req.params.id);

    return res.status(200).json({
      status: 200,
      data: user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

userRoutes.post('/', validateCreateUser, async (req, res) => {
  try {
    const user = await userService.create(req.body, req.user);

    return res.status(201).json({
      status: 201,
      data: user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

userRoutes.patch('/:id', validateUserId, validateUpdateUser, async (req, res) => {
  try {
    const user = await userService.update(req.params.id, req.body, req.user);

    return res.status(200).json({
      status: 200,
      data: user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

userRoutes.delete('/:id', validateUserId, async (req, res) => {
  try {
    const user = await userService.delete(req.params.id, req.user);

    return res.status(200).json({
      status: 200,
      data: user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

export default userRoutes;
