import express from 'express';
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from '../../config/security/cookies.js';
import { requireAuth } from '../../middlewares/auth/require-auth.js';
import authService from '../../services/auth/auth.service.js';
import { validateLogin } from '../../utils/validations/auth/auth.validation.js';

const authRoutes = express.Router();

authRoutes.post('/login', validateLogin, async (req, res) => {
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
