import '@dealer-desk/shared-config/load-env';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import {
  AUTH_CONTEXT_HEADER_MAP,
  buildForwardedAuthContext,
  buildInternalServiceHeaders,
  getBearerTokenFromAuthorizationHeader,
  verifyAccessToken,
} from '@dealer-desk/shared-auth';
import {
  getAllowedOrigin,
  getCatalogServiceUrl,
  getGatewayPort,
  getIdentityServiceUrl,
  getPlatformServiceUrl,
} from '@dealer-desk/shared-config';
import {
  sendErrorResponse,
  sendHealthResponse,
} from '@dealer-desk/shared-http';

const gatewayApp = express();
const PORT = getGatewayPort();
const identityServiceUrl = getIdentityServiceUrl();
const catalogServiceUrl = getCatalogServiceUrl();
const platformServiceUrl = getPlatformServiceUrl();
const IDENTITY_PUBLIC_AUTH_PATHS = new Set([
  '/api/admin/auth/health',
  '/api/admin/auth/login',
  '/api/admin/auth/forgot-password',
  '/api/admin/auth/password-action/verify',
  '/api/admin/auth/password-action/complete',
  '/api/admin/auth/refresh',
  '/api/admin/auth/logout',
  '/api/admin/users/health',
]);
const CATALOG_PUBLIC_PATHS = new Set([
  '/api/admin/products/health',
]);
const PLATFORM_PUBLIC_PATHS = new Set([
  '/api/platform/auth/login',
  '/api/platform/auth/refresh',
  '/api/platform/auth/logout',
  '/api/platform/systems/health',
]);

function isProtectedIdentityRoute(pathname) {
  if (IDENTITY_PUBLIC_AUTH_PATHS.has(pathname)) {
    return false;
  }

  if (pathname.startsWith('/api/admin/users')) {
    return true;
  }

  if (!pathname.startsWith('/api/admin/auth')) {
    return false;
  }

  return !IDENTITY_PUBLIC_AUTH_PATHS.has(pathname);
}

function isProtectedCatalogRoute(pathname) {
  if (CATALOG_PUBLIC_PATHS.has(pathname)) {
    return false;
  }

  return pathname.startsWith('/api/admin/products');
}

function isPlatformRoute(pathname) {
  return pathname.startsWith('/api/platform');
}

gatewayApp.disable('x-powered-by');
gatewayApp.use(cors({
  origin: getAllowedOrigin(),
  credentials: true,
}));
gatewayApp.use(morgan('dev'));

gatewayApp.get('/health', (_req, res) => {
  return sendHealthResponse(res, {
    service: 'api-gateway',
    upstreams: {
      catalog: catalogServiceUrl,
      identity: identityServiceUrl,
      platform: platformServiceUrl,
    },
  });
});

gatewayApp.use((req, res, next) => {
  const accessToken = getBearerTokenFromAuthorizationHeader(req.headers.authorization);
  const pathname = req.originalUrl.split('?')[0];
  const isPlatformRequest = isPlatformRoute(pathname);
  const routeRequiresAuth = isProtectedIdentityRoute(pathname)
    || isProtectedCatalogRoute(pathname);
  let accessTokenPayload = null;

  if (accessToken && !isPlatformRequest) {
    try {
      accessTokenPayload = verifyAccessToken(accessToken);
    } catch (_error) {
      if (routeRequiresAuth) {
        return sendErrorResponse(res, {
          statusCode: 401,
          message: 'Invalid or expired token.',
          code: 'GATEWAY_TOKEN_INVALID',
        });
      }
    }
  }

  if (routeRequiresAuth && !accessTokenPayload) {
    return sendErrorResponse(res, {
      statusCode: 401,
      message: 'Authentication required.',
      code: 'GATEWAY_AUTH_REQUIRED',
    });
  }

  const authContext = buildForwardedAuthContext({
    accessToken,
    accessTokenPayload,
  });
  const internalHeaders = buildInternalServiceHeaders();

  Object.entries(AUTH_CONTEXT_HEADER_MAP).forEach(([fieldName, headerName]) => {
    if (!authContext[fieldName]) {
      return;
    }

    req.headers[headerName] = authContext[fieldName];
  });

  Object.entries(internalHeaders).forEach(([headerName, headerValue]) => {
    req.headers[headerName] = headerValue;
  });

  next();
});

gatewayApp.use(createProxyMiddleware({
  pathFilter: '/api/admin/auth/**',
  target: identityServiceUrl,
  changeOrigin: true,
  pathRewrite: (path) => path.replace(/^\/api\/admin\/auth/, '/auth'),
}));

gatewayApp.use(createProxyMiddleware({
  pathFilter: '/api/admin/users/**',
  target: identityServiceUrl,
  changeOrigin: true,
  pathRewrite: (path) => path.replace(/^\/api\/admin\/users/, '/users'),
}));

gatewayApp.use(createProxyMiddleware({
  pathFilter: (pathname) => pathname.startsWith('/api/admin/products'),
  target: catalogServiceUrl,
  changeOrigin: true,
  pathRewrite: (path) => path.replace(/^\/api\/admin/, ''),
}));

gatewayApp.use(createProxyMiddleware({
  pathFilter: (pathname) => pathname.startsWith('/api/platform'),
  target: platformServiceUrl,
  changeOrigin: true,
  pathRewrite: (path) => path.replace(/^\/api\/platform/, ''),
}));

gatewayApp.use((_req, res) => {
  return sendErrorResponse(res, {
    statusCode: 404,
    message: 'Gateway route not found.',
    code: 'GATEWAY_ROUTE_NOT_FOUND',
  });
});

gatewayApp.use((error, _req, res, _next) => {
  return sendErrorResponse(res, {
    statusCode: error.statusCode || 502,
    message: error.message || 'Gateway proxy error.',
    code: error.code || 'GATEWAY_PROXY_ERROR',
  });
});

gatewayApp.listen(PORT, () => {
  console.log(`API gateway running on port ${PORT}`);
});
