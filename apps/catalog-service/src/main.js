import '@dealer-desk/shared-config/load-env';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import db from './config/db/db.js';
import publicCatalogRoutes from './routes/public/public-catalog.routes.js';
import productRoutes from './routes/products/product.routes.js';
import productImageRoutes from './routes/product-images/product-image.routes.js';
import { trimRequestStrings } from './middlewares/http/trim-request-strings.js';
import { requireInternalRequest } from './middlewares/http/require-internal-request.js';
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
const catalogSyncMode = (process.env.CATALOG_DB_SYNC_MODE || process.env.DB_SYNC_MODE || 'safe')
  .trim()
  .toLowerCase();

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
catalogApp.use(productRoutes);
catalogApp.use(productImageRoutes);

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
    await db.authenticate();
    await db.sync({ force: catalogSyncMode === 'force' });
    console.log('Catalog service database connection established.');
    console.log(`Catalog service schema sync completed in ${catalogSyncMode} mode.`);

    catalogApp.listen(PORT, () => {
      console.log(`Catalog service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting catalog service:', error.message);
    process.exit(1);
  }
}

startCatalogService();
