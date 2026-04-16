const ALLOWED_SYSTEM_STATUSES = ['draft', 'provisioning', 'active', 'suspended', 'archived'];

function pushRequiredStringError(errors, field, code, message) {
  errors.push({
    code,
    field,
    message,
  });
}

function validateOptionalString(body, field, errors, code) {
  if (body[field] !== undefined && typeof body[field] !== 'string') {
    errors.push({
      code,
      field,
      message: `The ${field} must be a string.`,
    });
  }
}

function validateCreateSystem(req, res, next) {
  const errors = [];
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      status: 400,
      errors: [{
        code: 'SYSTEM_BODY_INVALID',
        field: 'body',
        message: 'The request body must be a JSON object.',
      }],
    });
  }

  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    pushRequiredStringError(errors, 'name', 'SYSTEM_NAME_REQUIRED', 'The name is required.');
  }

  if (typeof body.slug !== 'string' || body.slug.trim().length === 0) {
    pushRequiredStringError(errors, 'slug', 'SYSTEM_SLUG_REQUIRED', 'The slug is required.');
  }

  validateOptionalString(body, 'plan_code', errors, 'SYSTEM_PLAN_CODE_NOT_STRING');
  validateOptionalString(body, 'admin_panel_url', errors, 'SYSTEM_ADMIN_PANEL_URL_NOT_STRING');
  validateOptionalString(body, 'public_site_url', errors, 'SYSTEM_PUBLIC_SITE_URL_NOT_STRING');
  validateOptionalString(body, 'custom_domain', errors, 'SYSTEM_CUSTOM_DOMAIN_NOT_STRING');
  validateOptionalString(body, 'default_subdomain', errors, 'SYSTEM_DEFAULT_SUBDOMAIN_NOT_STRING');
  validateOptionalString(body, 'country_code', errors, 'SYSTEM_COUNTRY_CODE_NOT_STRING');
  validateOptionalString(body, 'timezone', errors, 'SYSTEM_TIMEZONE_NOT_STRING');

  if (body.status !== undefined) {
    if (typeof body.status !== 'string') {
      errors.push({
        code: 'SYSTEM_STATUS_NOT_STRING',
        field: 'status',
        message: 'The status must be a string.',
      });
    } else if (!ALLOWED_SYSTEM_STATUSES.includes(body.status)) {
      errors.push({
        code: 'SYSTEM_STATUS_INVALID',
        field: 'status',
        message: `The status must be one of: ${ALLOWED_SYSTEM_STATUSES.join(', ')}.`,
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 400,
      errors,
    });
  }

  return next();
}

export { validateCreateSystem };
