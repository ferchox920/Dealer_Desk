import '@dealer-desk/shared-config/load-env';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import db from './config/db/db.js';
import internalLoginBackgroundRoutes from './routes/login-background/internal-login-background.routes.js';
import publicLoginBackgroundRoutes from './routes/login-background/public-login-background.routes.js';
import publicCatalogRoutes from './routes/public/public-catalog.routes.js';
import internalPlanRoutes from './routes/internal/internal-plan.routes.js';
import productRoutes from './routes/products/product.routes.js';
import productImageRoutes from './routes/product-images/product-image.routes.js';
import adminSiteContentRoutes from './routes/site-content/admin-site-content.routes.js';
import publicSiteContentRoutes from './routes/site-content/public-site-content.routes.js';
import { trimRequestStrings } from './middlewares/http/trim-request-strings.js';
import { requireInternalRequest } from './middlewares/http/require-internal-request.js';
import { ensureCatalogDatabaseReady } from './utils/db/migration-runtime.util.js';
import {
  getAllowedOrigin,
  getCatalogServicePort,
} from '@dealer-desk/shared-config';
import {
  sendErrorResponse,
  sendHealthResponse,
} from '@dealer-desk/shared-http';

const catalogApp = express();
const PORT = getCatalogServicePort();

function warnAboutDeprecatedSyncEnv() {
  if (process.env.CATALOG_DB_SYNC_MODE || process.env.DB_SYNC_MODE) {
    console.warn('Catalog sync env vars are deprecated. Run npm run migrate:up in @dealer-desk/catalog-service.');
  }
}

catalogApp.disable('x-powered-by');
catalogApp.use(cors({
  origin: getAllowedOrigin(),
  credentials: true,
}));
catalogApp.use(express.json());
catalogApp.use(trimRequestStrings);
catalogApp.use(morgan('dev'));

catalogApp.get('/health', (_req, res) => {
  return sendHealthResponse(res, {
    service: 'catalog-service',
    boundedContext: 'catalog',
  });
});

catalogApp.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }

  return requireInternalRequest(req, res, next);
});

catalogApp.get('/products/health', (_req, res) => {
  return res.status(200).json({
    status: 200,
    data: {
      message: 'Catalog service products surface is alive.',
    },
  });
});

catalogApp.use(publicCatalogRoutes);
catalogApp.use(publicLoginBackgroundRoutes);
catalogApp.use(publicSiteContentRoutes);
catalogApp.use(internalLoginBackgroundRoutes);
catalogApp.use(internalPlanRoutes);
catalogApp.use(productRoutes);
catalogApp.use(productImageRoutes);
catalogApp.use(adminSiteContentRoutes);

catalogApp.use((_req, res) => {
  return sendErrorResponse(res, {
    statusCode: 404,
    message: 'Catalog service route not found.',
    code: 'CATALOG_ROUTE_NOT_FOUND',
  });
});

catalogApp.use((error, _req, res, _next) => {
  return sendErrorResponse(res, {
    statusCode: error.statusCode || 500,
    message: error.message || 'Catalog service error.',
    code: error.code || 'CATALOG_SERVICE_ERROR',
  });
});

async function startCatalogService() {
  try {
    warnAboutDeprecatedSyncEnv();
    await db.authenticate();
    await ensureCatalogDatabaseReady();
    console.log('Catalog service database connection established.');
    console.log('Catalog service migrations checked.');

    catalogApp.listen(PORT, () => {
      console.log(`Catalog service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting catalog service:', error.message);
    process.exit(1);
  }
}

startCatalogService();
