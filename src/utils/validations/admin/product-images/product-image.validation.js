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

import {
  createUuidParamValidator,
  pushBoundedIntegerValidation,
} from '../../shared/common.validation.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  pushBoundedIntegerValidation(body, 'sort_order', errors, {
    prefix: 'IMAGE',
  });
  validateBoolean(body, 'is_cover', errors);

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

function validateReorderImages(req, res, next) {
  const orderedImageIds = req.body?.orderedImageIds;

  if (!Array.isArray(orderedImageIds) || orderedImageIds.length === 0) {
    return res.status(400).json({
      success: false,
      errors: [{
        code: 'ORDERED_IMAGE_IDS_REQUIRED',
        field: 'orderedImageIds',
        message: 'orderedImageIds must be a non-empty array.',
      }],
    });
  }

  const hasInvalidId = orderedImageIds.some((value) => typeof value !== 'string' || !UUID_PATTERN.test(value));

  if (hasInvalidId) {
    return res.status(400).json({
      success: false,
      errors: [{
        code: 'ORDERED_IMAGE_IDS_INVALID',
        field: 'orderedImageIds',
        message: 'Each orderedImageId must be a valid UUID.',
      }],
    });
  }

  next();
}

// Igual que con products/users, el detalle de UUID queda concentrado
// en common.validation.js para no repetir regex y mensajes.
const validateImageId = createUuidParamValidator({
  paramName: 'imageId',
  code: 'IMAGE_ID_INVALID',
  responseShape: 'success',
});

export { validateImageFiles, validateUpdateImage, validateReorderImages, validateImageId };
