// ============================================================================
// product-image.validation.js
//
// Middlewares de validación para las rutas de imágenes de productos.
// Se ejecutan ANTES de que el request llegue al service.
// Si algo es inválido, responden 400 inmediatamente.
//
// Estos middlewares son funciones (req, res, next):
//   - Si todo está bien → llaman next() y sigue al siguiente middleware/handler
//   - Si hay error → responden con JSON y el request se detiene ahí
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// --- Middlewares de validación para rutas de product-images ---

// Valida que multer haya recibido al menos un archivo de imagen
function validateImageFiles(req, res, next) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, errors: [
      { code: 'IMAGES_REQUIRED', field: 'images', message: 'At least one image file is required.' }
    ]});
  }

  next();
}

// Valida los campos editables del body en un update (sort_order, is_cover)
function validateUpdateImage(req, res, next) {
  const errors = [];
  const body = req.body;

  validateNumber(body, 'sort_order', errors);
  validateBoolean(body, 'is_cover', errors);

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

// Valida que el parámetro :imageId sea un UUID válido
function validateImageId(req, res, next) {
  const { imageId } = req.params;

  if (!imageId || !UUID_REGEX.test(imageId)) {
    return res.status(400).json({ success: false, errors: [
      { code: 'IMAGE_ID_INVALID', field: 'imageId', message: 'The imageId must be a valid UUID.' }
    ]});
  }

  next();
}

export { validateImageFiles, validateUpdateImage, validateImageId };
