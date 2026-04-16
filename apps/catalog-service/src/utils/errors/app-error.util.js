// ============================================================================
// app-error.util.js
//
// Error simple con status HTTP para que services y routes puedan compartir
// una misma convención sin meter librerías extras.
// ============================================================================

function createHttpError(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export { createHttpError };
