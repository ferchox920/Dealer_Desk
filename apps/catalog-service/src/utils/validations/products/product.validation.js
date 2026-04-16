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

export { validateCreateProduct, validateProductId, validateUpdateProduct };
