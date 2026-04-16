// ============================================================================
// common.validation.js
//
// Helpers compartidos para validaciones HTTP.
// Empezamos por UUID porque aparece en varias rutas y no conviene duplicar
// regex + mensajes + estructura de respuesta en cada módulo.
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POSTGRES_INTEGER_MIN = -2147483648;
const POSTGRES_INTEGER_MAX = 2147483647;

function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function buildUuidValidationError(field, code) {
  return {
    code,
    field,
    message: `The ${field} must be a valid UUID.`,
  };
}

function isFiniteSafeInteger(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Number.isInteger(value)
    && Number.isSafeInteger(value);
}

function pushBoundedIntegerValidation(body, field, errors, {
  prefix,
  min = POSTGRES_INTEGER_MIN,
  max = POSTGRES_INTEGER_MAX,
}) {
  if (body[field] === undefined) {
    return;
  }

  const value = body[field];

  if (typeof value !== 'number') {
    errors.push({
      code: `${prefix}_${field.toUpperCase()}_NOT_NUMBER`,
      field,
      message: `The ${field} must be a number.`,
    });
    return;
  }

  if (!isFiniteSafeInteger(value)) {
    errors.push({
      code: `${prefix}_${field.toUpperCase()}_INVALID_INTEGER`,
      field,
      message: `The ${field} must be a finite safe integer.`,
    });
    return;
  }

  if (value < min || value > max) {
    errors.push({
      code: `${prefix}_${field.toUpperCase()}_OUT_OF_RANGE`,
      field,
      message: `The ${field} must be between ${min} and ${max}.`,
    });
  }
}

// Factory para crear middlewares reusables:
// cada ruta define solo QUÉ parámetro validar y CÓMO quiere responder,
// mientras la lógica real del UUID vive en un único lugar.
function createUuidParamValidator({
  paramName,
  field = paramName,
  code,
  responseShape = 'status',
}) {
  return function validateUuidParam(req, res, next) {
    const value = req.params[paramName];

    if (isValidUuid(value)) {
      return next();
    }

    const error = buildUuidValidationError(field, code);

    if (responseShape === 'success') {
      return res.status(400).json({
        success: false,
        errors: [error],
      });
    }

    return res.status(400).json({
      status: 400,
      errors: [error],
    });
  };
}

export {
  POSTGRES_INTEGER_MAX,
  POSTGRES_INTEGER_MIN,
  UUID_REGEX,
  buildUuidValidationError,
  createUuidParamValidator,
  isFiniteSafeInteger,
  isValidUuid,
  pushBoundedIntegerValidation,
};
