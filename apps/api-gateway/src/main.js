import '@dealer-desk/shared-config/load-env';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import {
  AUTH_CONTEXT_HEADER_MAP,
  buildForwardedAuthContext,
  getBearerTokenFromAuthorizationHeader,
  verifyAccessToken,
} from '@dealer-desk/shared-auth';
import {
  getAllowedOrigin,
  getGatewayPort,
  getIdentityServiceUrl,
} from '@dealer-desk/shared-config';
import {
  sendErrorResponse,
  sendHealthResponse,
} from '@dealer-desk/shared-http';

const gatewayApp = express();
const PORT = getGatewayPort();
const identityServiceUrl = getIdentityServiceUrl();
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
      identity: identityServiceUrl,
    },
  });
});

gatewayApp.use((req, res, next) => {
  const accessToken = getBearerTokenFromAuthorizationHeader(req.headers.authorization);
  const pathname = req.originalUrl.split('?')[0];
  const routeRequiresAuth = isProtectedIdentityRoute(pathname);
  let accessTokenPayload = null;

  if (accessToken) {
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

  Object.entries(AUTH_CONTEXT_HEADER_MAP).forEach(([fieldName, headerName]) => {
    if (!authContext[fieldName]) {
      return;
    }

    req.headers[headerName] = authContext[fieldName];
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
