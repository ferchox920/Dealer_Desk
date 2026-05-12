import '@dealer-desk/shared-config/load-env';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth/auth.routes.js';
import planRoutes from './routes/plans/plan.routes.js';
import userRoutes from './routes/users/user.routes.js';
import db from './config/db/db.js';
import { trimRequestStrings } from './middlewares/http/trim-request-strings.js';
import { requireInternalRequest } from './middlewares/http/require-internal-request.js';
import { ensureIdentityDatabaseReady } from './utils/db/migration-runtime.util.js';
import {
  AUTH_CONTEXT_HEADER_MAP,
  getBearerTokenFromAuthorizationHeader,
} from '@dealer-desk/shared-auth';
import {
  getAllowedOrigin,
  getIdentityServicePort,
} from '@dealer-desk/shared-config';
import {
  sendErrorResponse,
  sendHealthResponse,
} from '@dealer-desk/shared-http';

const identityApp = express();
const PORT = getIdentityServicePort();
const skipDatabaseConnect = process.env.IDENTITY_SKIP_DB_CONNECT === 'true';

identityApp.disable('x-powered-by');
identityApp.use(cors({
  origin: getAllowedOrigin(),
  credentials: true,
}));
identityApp.use(express.json());
identityApp.use(trimRequestStrings);
identityApp.use(morgan('dev'));

identityApp.get('/health', (_req, res) => {
  return sendHealthResponse(res, {
    service: 'identity-service',
    boundedContext: 'identity',
  });
});

identityApp.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }

  return requireInternalRequest(req, res, next);
});

identityApp.get('/auth/health', (req, res) => {
  return res.status(200).json({
    status: 200,
    data: {
      message: 'Identity service auth surface is alive.',
      received_access_token: Boolean(
        getBearerTokenFromAuthorizationHeader(req.headers.authorization),
      ),
      forwarded_headers: {
        authenticated: req.headers[AUTH_CONTEXT_HEADER_MAP.isAuthenticated] || null,
        admin_email: req.headers[AUTH_CONTEXT_HEADER_MAP.adminEmail] || null,
        admin_id: req.headers[AUTH_CONTEXT_HEADER_MAP.adminId] || null,
        admin_role: req.headers[AUTH_CONTEXT_HEADER_MAP.adminRole] || null,
        request_access_token: req.headers[AUTH_CONTEXT_HEADER_MAP.accessToken] || null,
      },
    },
  });
});

identityApp.get('/users/health', (_req, res) => {
  return res.status(200).json({
    status: 200,
    data: {
      message: 'Identity service users surface is alive.',
    },
  });
});

identityApp.get('/plans/health', (_req, res) => {
  return res.status(200).json({
    status: 200,
    data: {
      message: 'Identity service plans surface is alive.',
    },
  });
});

// Fase 1 de extraccion:
// el servicio ya expone auth/users desde un proceso separado,
// pero sigue reutilizando la logica existente del monolito.
identityApp.use('/auth', authRoutes);
identityApp.use('/plans', planRoutes);
identityApp.use('/users', userRoutes);

identityApp.use((_req, res) => {
  return sendErrorResponse(res, {
    statusCode: 404,
    message: 'Identity service route not found.',
    code: 'IDENTITY_ROUTE_NOT_FOUND',
  });
});

identityApp.use((error, _req, res, _next) => {
  return sendErrorResponse(res, {
    statusCode: error.statusCode || 500,
    message: error.message || 'Identity service error.',
    code: error.code || 'IDENTITY_SERVICE_ERROR',
  });
});

async function startIdentityService() {
  try {
    if (skipDatabaseConnect) {
      console.warn('Identity service started without database connection because IDENTITY_SKIP_DB_CONNECT=true.');
    } else {
      await db.authenticate();
      console.log('Identity service database connection established.');
      await ensureIdentityDatabaseReady();
      console.log('Identity service migration readiness check completed.');
    }

    identityApp.listen(PORT, () => {
      console.log(`Identity service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting identity service:', error.message);
    process.exit(1);
  }
}

startIdentityService();
