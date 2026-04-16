import '@dealer-desk/shared-config/load-env';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import {
  AUTH_CONTEXT_HEADER_MAP,
  buildForwardedAuthContext,
  getBearerTokenFromAuthorizationHeader,
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

gatewayApp.disable('x-powered-by');
gatewayApp.use(cors({
  origin: getAllowedOrigin(),
  credentials: true,
}));
gatewayApp.use(express.json());
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
  const authContext = buildForwardedAuthContext({
    accessToken: getBearerTokenFromAuthorizationHeader(req.headers.authorization),
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
