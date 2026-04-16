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
