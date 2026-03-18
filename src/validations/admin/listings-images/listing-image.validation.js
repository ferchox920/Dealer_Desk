// Validadores reutilizables por tipo
function validateString(body, field, errors) {
  if (body[field] !== undefined && typeof body[field] !== 'string') {
    errors.push({ code: `IMAGE_${field.toUpperCase()}_NOT_STRING`, field, message: `The ${field} must be a string.` });
  }
}

function validateNumber(body, field, errors) {
  if (body[field] !== undefined && typeof body[field] !== 'number') {
    errors.push({ code: `IMAGE_${field.toUpperCase()}_NOT_NUMBER`, field, message: `The ${field} must be a number.` });
  }
}

function validateBoolean(body, field, errors) {
  if (body[field] !== undefined && typeof body[field] !== 'boolean') {
    errors.push({ code: `IMAGE_${field.toUpperCase()}_NOT_BOOLEAN`, field, message: `The ${field} must be a boolean.` });
  }
}

function validateCreateImage(req, res, next) {
  const errors = [];
  const body = req.body;

  validateNumber(body, 'listing_id', errors);
  validateString(body, 'cloudinary_public_id', errors);
  validateString(body, 'url', errors);
  validateNumber(body, 'sort_order', errors);
  validateBoolean(body, 'is_cover', errors);

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

function validateImageId(req, res, next) {
  const id = Number(req.params.imageId);

  if (!id || !Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, errors: [
      { code: 'IMAGE_ID_INVALID', field: 'imageId', message: 'The imageId must be a valid positive integer.' }
    ]});
  }

  next();
}

export { validateCreateImage, validateImageId };
