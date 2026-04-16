// ============================================================================
// auth.routes.js
//
// Rutas publicas y privadas del modulo auth del panel.
// Mantiene handlers delgados: validar -> delegar al service -> responder.
// ============================================================================

import express from 'express';
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from '../../../config/security/cookies.js';
import { requireAuth } from '../../../middlewares/auth/require-auth.js';
import {
  forgotPasswordLimiter,
  loginLimiter,
  passwordActionLimiter,
  refreshLimiter,
} from '../../../middlewares/security/rate-limiters.js';
import authService from '../../../services/admin/auth/auth.service.js';
import passwordActionService from '../../../services/admin/auth/password-action.service.js';
import {
  validateCompletePasswordAction,
  validateForgotPassword,
  validateLogin,
  validateVerifyPasswordAction,
} from '../../../utils/validations/admin/auth/auth.validation.js';

const authRoutes = express.Router();

authRoutes.post('/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const session = await authService.login({
      ...req.body,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    setRefreshTokenCookie(res, session.refreshToken);

    return res.status(200).json({
      status: 200,
      data: {
        accessToken: session.accessToken,
        admin: session.admin,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

authRoutes.post('/forgot-password', forgotPasswordLimiter, validateForgotPassword, async (req, res) => {
  try {
    await passwordActionService.requestForgotPassword(req.body);

    return res.status(200).json({
      status: 200,
      data: {
        message: 'If the account exists, a password email will be sent.',
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

authRoutes.post('/password-action/verify', passwordActionLimiter, validateVerifyPasswordAction, async (req, res) => {
  try {
    const passwordAction = await passwordActionService.verifyPasswordAction(req.body);

    return res.status(200).json({
      status: 200,
      data: passwordAction,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

authRoutes.post('/password-action/complete', passwordActionLimiter, validateCompletePasswordAction, async (req, res) => {
  try {
    const result = await passwordActionService.completePasswordAction(req.body);

    return res.status(200).json({
      status: 200,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

authRoutes.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    const session = await authService.refresh({
      refreshToken: getRefreshTokenFromRequest(req),
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    setRefreshTokenCookie(res, session.refreshToken);

    return res.status(200).json({
      status: 200,
      data: {
        accessToken: session.accessToken,
        admin: session.admin,
      },
    });
  } catch (error) {
    clearRefreshTokenCookie(res);

    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

authRoutes.post('/logout', async (req, res) => {
  try {
    await authService.logout({
      refreshToken: getRefreshTokenFromRequest(req),
    });

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      status: 200,
      data: {
        message: 'Logged out successfully.',
      },
    });
  } catch (error) {
    clearRefreshTokenCookie(res);

    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

authRoutes.get('/me', requireAuth, async (req, res) => {
  try {
    const admin = await authService.getCurrentAdmin(req.user.id);

    return res.status(200).json({
      status: 200,
      data: admin,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
});

export default authRoutes;
