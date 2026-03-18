// Validadores reutilizables por tipo
function validateString(body, field, errors) {
  if (body[field] !== undefined && typeof body[field] !== 'string') {
    errors.push({ code: `LISTING_${field.toUpperCase()}_NOT_STRING`, field, message: `The ${field} must be a string.` });
  }
}

function validateNumber(body, field, errors) {
  if (body[field] !== undefined && typeof body[field] !== 'number') {
    errors.push({ code: `LISTING_${field.toUpperCase()}_NOT_NUMBER`, field, message: `The ${field} must be a number.` });
  }
}

function validateArray(body, field, errors) {
  if (body[field] !== undefined && !Array.isArray(body[field])) {
    errors.push({ code: `LISTING_${field.toUpperCase()}_NOT_ARRAY`, field, message: `The ${field} must be an array.` });
  }
}

function validateCreateListing(req, res, next) {
  const errors = [];
  const body = req.body;

  validateNumber(body, 'year', errors);
  validateNumber(body, 'mileage', errors);
  validateNumber(body, 'price', errors);

  validateString(body, 'brand', errors);
  validateString(body, 'model', errors);
  validateString(body, 'drive_train', errors);
  validateString(body, 'fuel_type', errors);
  validateString(body, 'vin_number', errors);
  validateString(body, 'description', errors);

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

function validateListingId(req, res, next) {
  const id = Number(req.params.id);

  if (!id || !Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, errors: [
      { code: 'LISTING_ID_INVALID', field: 'id', message: 'The id must be a valid positive integer.' }
    ]});
  }

  next();
}

export { validateCreateListing, validateListingId };
