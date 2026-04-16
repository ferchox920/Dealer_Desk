import {
  AUTH_CONTEXT_HEADER_MAP,
  getBearerTokenFromAuthorizationHeader,
  verifyAccessToken,
} from '@dealer-desk/shared-auth';

function buildUserFromForwardedHeaders(req) {
  const isAuthenticated = req.headers[AUTH_CONTEXT_HEADER_MAP.isAuthenticated] === 'true';
  const id = req.headers[AUTH_CONTEXT_HEADER_MAP.adminId];
  const email = req.headers[AUTH_CONTEXT_HEADER_MAP.adminEmail];
  const role = req.headers[AUTH_CONTEXT_HEADER_MAP.adminRole];

  if (!isAuthenticated || !id || !role) {
    return null;
  }

  return {
    id,
    email: email || null,
    role,
  };
}

function buildUserFromBearerToken(req) {
  const accessToken = getBearerTokenFromAuthorizationHeader(req.headers.authorization);

  if (!accessToken) {
    return null;
  }

  const payload = verifyAccessToken(accessToken);

  return {
    id: payload.sub,
    email: payload.email ?? null,
    role: payload.role,
  };
}

function requireAuth(req, res, next) {
  try {
    const forwardedUser = buildUserFromForwardedHeaders(req);
    const user = forwardedUser ?? buildUserFromBearerToken(req);

    if (!user?.id || !user?.role) {
      return res.status(401).json({
        status: 401,
        error: 'Authentication required.',
      });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({
      status: 401,
      error: 'Invalid or expired token.',
    });
  }
}

export { requireAuth };
