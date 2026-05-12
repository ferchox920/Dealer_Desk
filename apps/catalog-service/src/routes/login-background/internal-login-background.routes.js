import express from 'express';
import loginBackgroundService from '../../services/login-background/login-background.service.js';

const internalLoginBackgroundRoutes = express.Router();

function sendLoginBackgroundError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
  });
}

internalLoginBackgroundRoutes.post('/internal/login-background/refresh', async (_req, res) => {
  try {
    const background = await loginBackgroundService.refreshFromProvider();

    return res.status(200).json({
      status: 200,
      data: background,
    });
  } catch (error) {
    return sendLoginBackgroundError(res, error);
  }
});

internalLoginBackgroundRoutes.post('/internal/login-background/cleanup', async (_req, res) => {
  try {
    const deletedCount = await loginBackgroundService.cleanupHistory();

    return res.status(200).json({
      status: 200,
      data: {
        deleted_count: deletedCount,
      },
    });
  } catch (error) {
    return sendLoginBackgroundError(res, error);
  }
});

export default internalLoginBackgroundRoutes;
