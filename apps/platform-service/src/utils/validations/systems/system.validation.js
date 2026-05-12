const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_FIELDS = ['admin_panel_url', 'public_site_url'];
const STRING_UPDATE_FIELDS = [
  'name',
  'admin_panel_url',
  'public_site_url',
  'custom_domain',
  'default_subdomain',
];

function sendValidationErrors(res, errors) {
  return res.status(400).json({
    status: 400,
    errors,
  });
}

function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function pushBoundedIntegerValidation(body, field, errors, { prefix, min = 0 } = {}) {
  if (body[field] === undefined || body[field] === null) {
    return;
  }

  if (
    typeof body[field] !== 'number'
    || !Number.isInteger(body[field])
    || body[field] < min
  ) {
    errors.push({
      code: `${prefix}_${field.toUpperCase()}_INVALID`,
      field,
      message: `The ${field} must be an integer greater than or equal to ${min}.`,
    });
  }
}

function createUuidParamValidator({
  paramName,
  field,
  code,
}) {
  return (req, res, next) => {
    const value = req.params[paramName];

    if (isValidUuid(value)) {
      return next();
    }

    return res.status(400).json({
      status: 400,
      errors: [{
        code,
        field,
        message: `The ${field} must be a valid UUID.`,
      }],
    });
  };
}

function pushRequiredString(body, field, errors, codePrefix) {
  if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
    errors.push({
      code: `${codePrefix}_${field.toUpperCase()}_REQUIRED`,
      field,
      message: `The ${field} is required.`,
    });
  }
}

function pushOptionalString(body, field, errors, codePrefix) {
  if (body[field] === undefined || body[field] === null) {
    return;
  }

  if (typeof body[field] !== 'string') {
    errors.push({
      code: `${codePrefix}_${field.toUpperCase()}_NOT_STRING`,
      field,
      message: `The ${field} must be a string.`,
    });
  }
}

function pushOptionalUrl(body, field, errors, codePrefix) {
  if (body[field] === undefined || body[field] === null || body[field] === '') {
    return;
  }

  if (typeof body[field] !== 'string') {
    errors.push({
      code: `${codePrefix}_${field.toUpperCase()}_NOT_STRING`,
      field,
      message: `The ${field} must be a string.`,
    });
    return;
  }

  try {
    const parsedUrl = new URL(body[field]);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol.');
    }
  } catch (_error) {
    errors.push({
      code: `${codePrefix}_${field.toUpperCase()}_INVALID_URL`,
      field,
      message: `The ${field} must be a valid http or https URL.`,
    });
  }
}

function isValidIsoDate(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  const parsedDate = new Date(value);
  return !Number.isNaN(parsedDate.getTime());
}

function pushRequiredIsoDate(body, field, errors, codePrefix) {
  if (!isValidIsoDate(body[field])) {
    errors.push({
      code: `${codePrefix}_${field.toUpperCase()}_INVALID`,
      field,
      message: `The ${field} must be a valid ISO date string.`,
    });
  }
}

function validateCreateSystem(req, res, next) {
  const errors = [];
  const body = req.body || {};

  pushRequiredString(body, 'name', errors, 'PLATFORM_SYSTEM');
  pushRequiredString(body, 'slug', errors, 'PLATFORM_SYSTEM');
  pushRequiredString(body, 'location_id', errors, 'PLATFORM_SYSTEM');
  pushRequiredString(body, 'default_currency_code', errors, 'PLATFORM_SYSTEM');
  pushRequiredString(body, 'plan_code', errors, 'PLATFORM_SYSTEM');
  pushRequiredIsoDate(body, 'next_renewal_at', errors, 'PLATFORM_SYSTEM');
  pushBoundedIntegerValidation(body, 'grace_days', errors, {
    prefix: 'PLATFORM_SYSTEM',
    min: 0,
  });

  if (typeof body.location_id === 'string' && !isValidUuid(body.location_id)) {
    errors.push({
      code: 'PLATFORM_SYSTEM_LOCATION_ID_INVALID',
      field: 'location_id',
      message: 'The location_id must be a valid UUID.',
    });
  }

  if (typeof body.slug === 'string' && !SLUG_REGEX.test(body.slug.trim().toLowerCase())) {
    errors.push({
      code: 'PLATFORM_SYSTEM_SLUG_INVALID',
      field: 'slug',
      message: 'The slug must use lowercase letters, numbers, and hyphens.',
    });
  }

  if (!Array.isArray(body.currency_codes) || body.currency_codes.length === 0) {
    errors.push({
      code: 'PLATFORM_SYSTEM_CURRENCIES_REQUIRED',
      field: 'currency_codes',
      message: 'At least one currency is required.',
    });
  } else if (body.currency_codes.some((code) => typeof code !== 'string' || code.trim().length === 0)) {
    errors.push({
      code: 'PLATFORM_SYSTEM_CURRENCIES_INVALID',
      field: 'currency_codes',
      message: 'Every currency code must be a non-empty string.',
    });
  }

  for (const field of URL_FIELDS) {
    pushOptionalUrl(body, field, errors, 'PLATFORM_SYSTEM');
  }

  pushOptionalString(body, 'custom_domain', errors, 'PLATFORM_SYSTEM');
  pushOptionalString(body, 'default_subdomain', errors, 'PLATFORM_SYSTEM');

  if (body.addons !== undefined) {
    if (!Array.isArray(body.addons)) {
      errors.push({
        code: 'PLATFORM_SYSTEM_ADDONS_INVALID',
        field: 'addons',
        message: 'The addons field must be an array.',
      });
    } else {
      body.addons.forEach((addon, index) => {
        if (!addon || typeof addon !== 'object') {
          errors.push({
            code: 'PLATFORM_SYSTEM_ADDON_INVALID',
            field: `addons[${index}]`,
            message: 'Each addon must be an object.',
          });
          return;
        }

        if (typeof addon.addon_code !== 'string' || addon.addon_code.trim().length === 0) {
          errors.push({
            code: 'PLATFORM_SYSTEM_ADDON_CODE_REQUIRED',
            field: `addons[${index}].addon_code`,
            message: 'Each addon requires an addon_code.',
          });
        }

        if (
          addon.quantity !== undefined
          && (
            typeof addon.quantity !== 'number'
            || !Number.isInteger(addon.quantity)
            || addon.quantity < 1
          )
        ) {
          errors.push({
            code: 'PLATFORM_SYSTEM_ADDON_QUANTITY_INVALID',
            field: `addons[${index}].quantity`,
            message: 'Each addon quantity must be a positive integer.',
          });
        }
      });
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  return next();
}

function validateUpdateSystem(req, res, next) {
  const errors = [];
  const body = req.body || {};

  for (const field of STRING_UPDATE_FIELDS) {
    pushOptionalString(body, field, errors, 'PLATFORM_SYSTEM');
  }

  pushOptionalString(body, 'location_id', errors, 'PLATFORM_SYSTEM');

  if (typeof body.location_id === 'string' && !isValidUuid(body.location_id)) {
    errors.push({
      code: 'PLATFORM_SYSTEM_LOCATION_ID_INVALID',
      field: 'location_id',
      message: 'The location_id must be a valid UUID.',
    });
  }

  if (body.name !== undefined && typeof body.name === 'string' && body.name.trim().length === 0) {
    errors.push({
      code: 'PLATFORM_SYSTEM_NAME_REQUIRED',
      field: 'name',
      message: 'The name cannot be empty.',
    });
  }

  for (const field of URL_FIELDS) {
    pushOptionalUrl(body, field, errors, 'PLATFORM_SYSTEM');
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  return next();
}

function validateDatabaseCredentials(req, res, next) {
  const errors = [];
  pushRequiredString(req.body || {}, 'connection_string', errors, 'PLATFORM_DATABASE_CREDENTIALS');

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  return next();
}

function validateCloudinaryCredentials(req, res, next) {
  const errors = [];
  const body = req.body || {};

  pushRequiredString(body, 'cloud_name', errors, 'PLATFORM_CLOUDINARY_CREDENTIALS');
  pushRequiredString(body, 'api_key', errors, 'PLATFORM_CLOUDINARY_CREDENTIALS');
  pushRequiredString(body, 'api_secret', errors, 'PLATFORM_CLOUDINARY_CREDENTIALS');

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  return next();
}

function validateSubscription(req, res, next) {
  const errors = [];
  const body = req.body || {};
  pushRequiredString(body, 'plan_code', errors, 'PLATFORM_SUBSCRIPTION');
  pushRequiredIsoDate(body, 'next_renewal_at', errors, 'PLATFORM_SUBSCRIPTION');
  pushBoundedIntegerValidation(body, 'grace_days', errors, {
    prefix: 'PLATFORM_SUBSCRIPTION',
    min: 0,
  });

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  return next();
}

function validateAddon(req, res, next) {
  const errors = [];
  const body = req.body || {};

  pushRequiredString(body, 'addon_code', errors, 'PLATFORM_ADDON');

  if (body.quantity !== undefined) {
    if (
      typeof body.quantity !== 'number'
      || !Number.isInteger(body.quantity)
      || body.quantity < 1
    ) {
      errors.push({
        code: 'PLATFORM_ADDON_QUANTITY_INVALID',
        field: 'quantity',
        message: 'The quantity must be a positive integer.',
      });
    }
  }

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  return next();
}

function validateRecordPayment(req, res, next) {
  const errors = [];
  const body = req.body || {};

  pushRequiredIsoDate(body, 'paid_at', errors, 'PLATFORM_PAYMENT');
  pushRequiredIsoDate(body, 'next_renewal_at', errors, 'PLATFORM_PAYMENT');
  pushBoundedIntegerValidation(body, 'grace_days', errors, {
    prefix: 'PLATFORM_PAYMENT',
    min: 0,
  });

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  return next();
}

function validateProvisionSystem(req, res, next) {
  const errors = [];
  const body = req.body || {};
  const requiredFields = [
    'catalog_base_url',
    'identity_base_url',
    'database_name',
    'owner_email',
  ];

  requiredFields.forEach((field) => {
    if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
      errors.push({
        code: `SYSTEM_${field.toUpperCase()}_REQUIRED`,
        field,
        message: `The ${field} is required.`,
      });
    }
  });

  pushOptionalString(body, 'admin_panel_url', errors, 'SYSTEM');
  pushOptionalString(body, 'public_site_url', errors, 'SYSTEM');

  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }

  return next();
}

const validateSystemId = createUuidParamValidator({
  paramName: 'id',
  field: 'system_id',
  code: 'PLATFORM_SYSTEM_ID_INVALID',
});

const validateAddonId = createUuidParamValidator({
  paramName: 'addonId',
  field: 'addon_id',
  code: 'PLATFORM_ADDON_ID_INVALID',
});

const validateProvisioningRunId = createUuidParamValidator({
  paramName: 'runId',
  field: 'provisioning_run_id',
  code: 'SYSTEM_PROVISIONING_RUN_ID_INVALID',
});

export {
  validateAddon,
  validateAddonId,
  validateCloudinaryCredentials,
  validateCreateSystem,
  validateDatabaseCredentials,
  validateProvisioningRunId,
  validateProvisionSystem,
  validateRecordPayment,
  validateSubscription,
  validateSystemId,
  validateUpdateSystem,
};
