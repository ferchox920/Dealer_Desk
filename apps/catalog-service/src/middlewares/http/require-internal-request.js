import { hasValidInternalServiceSecret } from '@dealer-desk/shared-auth';

function requireInternalRequest(req, res, next) {
  if (hasValidInternalServiceSecret(req.headers)) {
    return next();
  }

  return res.status(403).json({
    status: 403,
    error: 'This service only accepts requests from the API gateway.',
    code: 'INTERNAL_REQUEST_REQUIRED',
  });
}

export { requireInternalRequest };
