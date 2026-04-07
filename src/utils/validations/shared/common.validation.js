// ============================================================================
// common.validation.js
//
// Helpers compartidos para validaciones HTTP.
// Empezamos por UUID porque aparece en varias rutas y no conviene duplicar
// regex + mensajes + estructura de respuesta en cada módulo.
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  UUID_REGEX,
  buildUuidValidationError,
  createUuidParamValidator,
  isValidUuid,
};
