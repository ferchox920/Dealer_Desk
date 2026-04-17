// ============================================================================
// product.validation.js
//
// Middlewares de validación para las rutas de productos.
// Valida tipos de datos en el body y formato UUID en params.
// ============================================================================

import {
  createUuidParamValidator,
  pushBoundedIntegerValidation,
} from '../shared/common.validation.js';
import {
  PRODUCT_CURRENCY_CODES,
  PRODUCT_MILEAGE_MAX,
  PRODUCT_MILEAGE_MIN,
  PRODUCT_YEAR_MIN,
  getProductYearMax,
} from '../../../constants/product-ranges.js';

const REQUIRED_PRODUCT_FIELDS = [
  'year',
  'brand',
  'model',
  'mileage',
  'price',
  'drive_train',
  'fuel_type',
  'vin_number',
];
const MAX_PUBLIC_CATALOG_LIMIT = 60;
const ALLOWED_PUBLIC_CATALOG_SORT_FIELDS = ['created_at', 'price', 'year'];
const ALLOWED_PUBLIC_CATALOG_SORT_DIRECTIONS = ['asc', 'desc'];

function validateRequiredField(body, field, errors) {
  if (body[field] !== undefined) {
    return;
  }

  errors.push({
    code: `PRODUCT_${field.toUpperCase()}_REQUIRED`,
    field,
    message: `The ${field} is required.`,
  });
}

function parseOptionalInteger(value, field, errors, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue)) {
    errors.push({
      code: `PRODUCT_${field.toUpperCase()}_INVALID`,
      field,
      message: `The ${field} must be an integer.`,
    });
    return undefined;
  }

  if (parsedValue < min || parsedValue > max) {
    errors.push({
      code: `PRODUCT_${field.toUpperCase()}_OUT_OF_RANGE`,
      field,
      message: `The ${field} must be between ${min} and ${max}.`,
    });
    return undefined;
  }

  return parsedValue;
}

function normalizeProductBody(body, errors) {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return body;
  }

  errors.push({
    code: 'PRODUCT_BODY_INVALID',
    field: 'body',
    message: 'The request body must be a JSON object.',
  });

  return {};
}

// Valida que un campo del body sea string (si fue enviado)
function validateString(body, field, errors) {
  if (body[field] !== undefined && typeof body[field] !== 'string') {
    errors.push({ code: `PRODUCT_${field.toUpperCase()}_NOT_STRING`, field, message: `The ${field} must be a string.` });
  }
}

function validateCurrencyCode(body, field, errors) {
  if (body[field] === undefined) {
    return;
  }

  if (typeof body[field] !== 'string') {
    errors.push({ code: 'PRODUCT_CURRENCY_CODE_NOT_STRING', field, message: 'The currency_code must be a string.' });
    return;
  }

  const normalizedValue = body[field].toUpperCase();

  if (!PRODUCT_CURRENCY_CODES.includes(normalizedValue)) {
    errors.push({ code: 'PRODUCT_CURRENCY_CODE_INVALID', field, message: 'The currency_code must be CLP or USD.' });
  }
}

function validatePublicCatalogQuery(req, res, next) {
  const errors = [];
  const filters = {
    brand: typeof req.query.brand === 'string' ? req.query.brand.trim() : undefined,
    model: typeof req.query.model === 'string' ? req.query.model.trim() : undefined,
    currency_code: typeof req.query.currency_code === 'string'
      ? req.query.currency_code.trim().toUpperCase()
      : undefined,
  };

  if (filters.currency_code && !PRODUCT_CURRENCY_CODES.includes(filters.currency_code)) {
    errors.push({
      code: 'PRODUCT_CURRENCY_CODE_INVALID',
      field: 'currency_code',
      message: 'The currency_code must be CLP or USD.',
    });
  }

  filters.year_from = parseOptionalInteger(req.query.year_from, 'year_from', errors, {
    min: PRODUCT_YEAR_MIN,
    max: getProductYearMax(),
  });
  filters.year_to = parseOptionalInteger(req.query.year_to, 'year_to', errors, {
    min: PRODUCT_YEAR_MIN,
    max: getProductYearMax(),
  });
  filters.price_min = parseOptionalInteger(req.query.price_min, 'price_min', errors, {
    min: 0,
  });
  filters.price_max = parseOptionalInteger(req.query.price_max, 'price_max', errors, {
    min: 0,
  });
  filters.limit = parseOptionalInteger(req.query.limit, 'limit', errors, {
    min: 1,
    max: MAX_PUBLIC_CATALOG_LIMIT,
  }) ?? 24;
  filters.page = parseOptionalInteger(req.query.page, 'page', errors, {
    min: 1,
  }) ?? 1;
  filters.sort_by = typeof req.query.sort_by === 'string'
    ? req.query.sort_by.trim().toLowerCase()
    : 'created_at';
  filters.sort_direction = typeof req.query.sort_direction === 'string'
    ? req.query.sort_direction.trim().toLowerCase()
    : 'desc';

  if (!ALLOWED_PUBLIC_CATALOG_SORT_FIELDS.includes(filters.sort_by)) {
    errors.push({
      code: 'PRODUCT_SORT_BY_INVALID',
      field: 'sort_by',
      message: `sort_by must be one of: ${ALLOWED_PUBLIC_CATALOG_SORT_FIELDS.join(', ')}.`,
    });
  }

  if (!ALLOWED_PUBLIC_CATALOG_SORT_DIRECTIONS.includes(filters.sort_direction)) {
    errors.push({
      code: 'PRODUCT_SORT_DIRECTION_INVALID',
      field: 'sort_direction',
      message: `sort_direction must be one of: ${ALLOWED_PUBLIC_CATALOG_SORT_DIRECTIONS.join(', ')}.`,
    });
  }

  if (
    filters.year_from !== undefined
    && filters.year_to !== undefined
    && filters.year_from > filters.year_to
  ) {
    errors.push({
      code: 'PRODUCT_YEAR_RANGE_INVALID',
      field: 'year_from',
      message: 'year_from cannot be greater than year_to.',
    });
  }

  if (
    filters.price_min !== undefined
    && filters.price_max !== undefined
    && filters.price_min > filters.price_max
  ) {
    errors.push({
      code: 'PRODUCT_PRICE_RANGE_INVALID',
      field: 'price_min',
      message: 'price_min cannot be greater than price_max.',
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 400,
      errors,
    });
  }

  req.catalogFilters = filters;
  return next();
}

function validateProductPayload(body, errors, { requireAllFields = false } = {}) {
  if (requireAllFields) {
    REQUIRED_PRODUCT_FIELDS.forEach((field) => validateRequiredField(body, field, errors));
  }

  pushBoundedIntegerValidation(body, 'year', errors, {
    prefix: 'PRODUCT',
    min: PRODUCT_YEAR_MIN,
    max: getProductYearMax(),
  });
  pushBoundedIntegerValidation(body, 'mileage', errors, {
    prefix: 'PRODUCT',
    min: PRODUCT_MILEAGE_MIN,
    max: PRODUCT_MILEAGE_MAX,
  });
  pushBoundedIntegerValidation(body, 'price', errors, {
    prefix: 'PRODUCT',
    min: 0,
  });

  validateString(body, 'brand', errors);
  validateString(body, 'model', errors);
  validateString(body, 'drive_train', errors);
  validateString(body, 'fuel_type', errors);
  validateString(body, 'vin_number', errors);
  validateString(body, 'description', errors);
  validateCurrencyCode(body, 'currency_code', errors);
}

// Middleware: create exige todos los campos operativos del producto.
function validateCreateProduct(req, res, next) {
  const errors = [];
  const body = normalizeProductBody(req.body, errors);

  validateProductPayload(body, errors, { requireAllFields: true });

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

// Middleware: update mantiene soporte para cambios parciales.
function validateUpdateProduct(req, res, next) {
  const errors = [];
  const body = normalizeProductBody(req.body, errors);

  validateProductPayload(body, errors);

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

// Reutilizamos el helper compartido para que la regla UUID viva en un solo sitio.
const validateProductId = createUuidParamValidator({
  paramName: 'id',
  code: 'PRODUCT_ID_INVALID',
  responseShape: 'success',
});

export {
  validateCreateProduct,
  validateProductId,
  validatePublicCatalogQuery,
  validateUpdateProduct,
};
