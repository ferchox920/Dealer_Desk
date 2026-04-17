const ALLOWED_SYSTEM_STATUSES = ['draft', 'provisioning', 'active', 'suspended', 'archived'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function validateUuidParam(req, res, next, fieldName, errorCode) {
  const value = req.params[fieldName];

  if (typeof value === 'string' && UUID_REGEX.test(value)) {
    return next();
  }

  return res.status(400).json({
    status: 400,
    errors: [{
      code: errorCode,
      field: fieldName,
      message: `The ${fieldName} must be a valid UUID.`,
    }],
  });
}

function validateSystemId(req, res, next) {
  return validateUuidParam(req, res, next, 'id', 'SYSTEM_ID_INVALID');
}

function validateProvisioningRunId(req, res, next) {
  return validateUuidParam(req, res, next, 'runId', 'SYSTEM_PROVISIONING_RUN_ID_INVALID');
}

function validateProvisionSystem(req, res, next) {
  const errors = [];
  const body = req.body;
  const requiredFields = [
    'catalog_base_url',
    'identity_base_url',
    'database_name',
    'owner_email',
  ];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      status: 400,
      errors: [{
        code: 'SYSTEM_PROVISION_BODY_INVALID',
        field: 'body',
        message: 'The request body must be a JSON object.',
      }],
    });
  }

  requiredFields.forEach((field) => {
    if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
      pushRequiredStringError(errors, field, `SYSTEM_${field.toUpperCase()}_REQUIRED`, `The ${field} is required.`);
    }
  });

  validateOptionalString(body, 'admin_panel_url', errors, 'SYSTEM_ADMIN_PANEL_URL_NOT_STRING');
  validateOptionalString(body, 'public_site_url', errors, 'SYSTEM_PUBLIC_SITE_URL_NOT_STRING');

  if (errors.length > 0) {
    return res.status(400).json({
      status: 400,
      errors,
    });
  }

  return next();
}

export {
  validateCreateSystem,
  validateProvisioningRunId,
  validateProvisionSystem,
  validateSystemId,
};
