import express from 'express';
import loginBackgroundService from '../../services/login-background/login-background.service.js';

const publicLoginBackgroundRoutes = express.Router();

function sendLoginBackgroundError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
  });
}

publicLoginBackgroundRoutes.get('/catalog/login-background', async (_req, res) => {
  try {
    const background = await loginBackgroundService.getPublicBackground();

    return res.status(200).json({
      status: 200,
      data: background,
    });
  } catch (error) {
    return sendLoginBackgroundError(res, error);
  }
});

export default publicLoginBackgroundRoutes;
