// ============================================================================
// cookies.js
//
// Manejo mínimo de cookies para refresh token sin agregar una dependencia extra
// solo para parsearlas. Express ya sabe ESCRIBIR cookies con res.cookie();
// aquí resolvemos cómo leerlas desde req.headers.cookie.
// ============================================================================

const REFRESH_TOKEN_COOKIE_NAME = 'dealer_desk_refresh_token';

function getRefreshCookieBaseOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const forceSecureCookie = process.env.COOKIE_SECURE === 'true';

  return {
    httpOnly: true,
    // En produccion la cookie SIEMPRE debe ir solo por HTTPS.
    // En desarrollo dejamos una bandera opcional por si quieres probar localmente con secure.
    secure: isProduction || forceSecureCookie,
    sameSite: 'lax',
    path: '/api/admin/auth',
  };
}

function getRefreshCookieOptions() {
  const refreshDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

  return {
    ...getRefreshCookieBaseOptions(),
    maxAge: refreshDays * 24 * 60 * 60 * 1000,
  };
}

function parseCookies(cookieHeader = '') {
  if (typeof cookieHeader !== 'string' || cookieHeader.trim().length === 0) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf('=');

        if (separatorIndex === -1) {
          return [part, ''];
        }

        const key = part.slice(0, separatorIndex).trim();
        const value = part.slice(separatorIndex + 1).trim();

        return [key, decodeURIComponent(value)];
      }),
  );
}

function getRefreshTokenFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[REFRESH_TOKEN_COOKIE_NAME] ?? null;
}

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getRefreshCookieBaseOptions());
}

export {
  REFRESH_TOKEN_COOKIE_NAME,
  clearRefreshTokenCookie,
  getRefreshCookieBaseOptions,
  getRefreshCookieOptions,
  getRefreshTokenFromRequest,
  parseCookies,
  setRefreshTokenCookie,
};
