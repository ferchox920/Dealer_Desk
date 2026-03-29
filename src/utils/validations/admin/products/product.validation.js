const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateString(body, field, errors) {
  if (body[field] !== undefined && typeof body[field] !== 'string') {
    errors.push({ code: `PRODUCT_${field.toUpperCase()}_NOT_STRING`, field, message: `The ${field} must be a string.` });
  }
}

function validateNumber(body, field, errors) {
  if (body[field] !== undefined && typeof body[field] !== 'number') {
    errors.push({ code: `PRODUCT_${field.toUpperCase()}_NOT_NUMBER`, field, message: `The ${field} must be a number.` });
  }
}

function validateCreateProduct(req, res, next) {
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

function validateProductId(req, res, next) {
  const { id } = req.params;

  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ success: false, errors: [
      { code: 'PRODUCT_ID_INVALID', field: 'id', message: 'The id must be a valid UUID.' }
    ]});
  }

  next();
}

export { validateCreateProduct, validateProductId };
