// ============================================================================
// trim-request-strings.js
//
// Middleware global que recorta espacios al inicio/final de strings en body y
// query. Lo hacemos una sola vez aquí para no repetir `.trim()` por todas las
// rutas del proyecto.
//
// Nota importante:
// también afecta passwords. Normalmente algunos sistemas dejan los espacios
// como parte exacta de la contraseña, pero aquí seguimos tu preferencia:
// si el usuario escribe espacios accidentales alrededor, se limpian.
// ============================================================================

import { deepTrimStringValues } from '../../utils/normalizers/string-normalizer.util.js';

function trimRequestStrings(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = deepTrimStringValues(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = deepTrimStringValues(req.query);
  }

  next();
}

export { trimRequestStrings };
