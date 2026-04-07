// ============================================================================
// auth.routes.js
//
// Rutas base de autenticación del panel.
// ============================================================================

import express from 'express';
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from '../../../config/security/cookies.js';
import authService from '../../../services/admin/auth/auth.service.js';
import { requireAuth } from '../../../middlewares/auth/require-auth.js';
import { validateLogin } from '../../../utils/validations/admin/auth/auth.validation.js';

const authRoutes = express.Router();

authRoutes.post('/login', validateLogin, async (req, res) => {
  try {
    const session = await authService.login({
      ...req.body,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    // El refresh token viaja en cookie HttpOnly para que el frontend
    // no tenga que guardarlo en localStorage ni manejarlo manualmente.
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

// refresh:
// 1) lee la cookie HttpOnly
// 2) valida que esa sesión siga vigente
// 3) rota el refresh token
// 4) devuelve un nuevo access token
authRoutes.post('/refresh', async (req, res) => {
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

// logout:
// 1) intenta revocar la sesión actual si existe cookie
// 2) limpia la cookie en el navegador
// 3) responde OK aunque el frontend ya no tenga el token
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
