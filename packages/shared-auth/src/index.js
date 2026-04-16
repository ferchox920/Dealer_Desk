const AUTH_CONTEXT_HEADER_MAP = {
  accessToken: 'x-access-token',
  isAuthenticated: 'x-authenticated',
};

function getBearerTokenFromAuthorizationHeader(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.replace('Bearer ', '').trim();
  return token || null;
}

function buildForwardedAuthContext({ accessToken = null } = {}) {
  return {
    accessToken,
    isAuthenticated: accessToken ? 'true' : 'false',
  };
}

export {
  AUTH_CONTEXT_HEADER_MAP,
  buildForwardedAuthContext,
  getBearerTokenFromAuthorizationHeader,
};
