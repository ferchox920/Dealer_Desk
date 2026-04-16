import '@dealer-desk/shared-config/load-env';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth/auth.routes.js';
import db from './config/db/db.js';
import systemRoutes from './routes/systems/system.routes.js';
import { trimRequestStrings } from './middlewares/http/trim-request-strings.js';
import {
  getAllowedOrigin,
  getPlatformServicePort,
} from '@dealer-desk/shared-config';
import {
  sendErrorResponse,
  sendHealthResponse,
} from '@dealer-desk/shared-http';

const platformApp = express();
const PORT = getPlatformServicePort();

platformApp.disable('x-powered-by');
platformApp.use(cors({
  origin: getAllowedOrigin(),
  credentials: true,
}));
platformApp.use(express.json());
platformApp.use(trimRequestStrings);
platformApp.use(morgan('dev'));

platformApp.get('/health', (_req, res) => {
  return sendHealthResponse(res, {
    service: 'platform-service',
    boundedContext: 'platform',
  });
});

platformApp.get('/systems/health', (_req, res) => {
  return res.status(200).json({
    status: 200,
    data: {
      message: 'Platform service systems surface is alive.',
    },
  });
});

platformApp.use('/auth', authRoutes);
platformApp.use(systemRoutes);

platformApp.use((_req, res) => {
  return sendErrorResponse(res, {
    statusCode: 404,
    message: 'Platform service route not found.',
    code: 'PLATFORM_ROUTE_NOT_FOUND',
  });
});

platformApp.use((error, _req, res, _next) => {
  return sendErrorResponse(res, {
    statusCode: error.statusCode || 500,
    message: error.message || 'Platform service error.',
    code: error.code || 'PLATFORM_SERVICE_ERROR',
  });
});

async function startPlatformService() {
  try {
    await db.authenticate();
    await db.sync();
    console.log('Platform service database connection established.');

    platformApp.listen(PORT, () => {
      console.log(`Platform service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting platform service:', error.message);
    process.exit(1);
  }
}

startPlatformService();
