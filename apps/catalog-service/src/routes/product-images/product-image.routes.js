// ============================================================================
// product-image.routes.js
//
// Endpoints HTTP para imágenes de productos.
// Todas las rutas están bajo /products/:id/images (anidadas al producto).
//
// Flujo de cada ruta:
//   1. Valida parámetros (validateProductId, validateImageId)
//   2. Si hay archivos, Multer los procesa (upload.array)
//   3. Valida archivos o body según el caso
//   4. Llama al service correspondiente
//   5. Devuelve JSON
//
// Las rutas NO contienen lógica de negocio, solo orquestan.
// ============================================================================

import express from 'express';
import { OWNER_ROLE, STAFF_ROLE } from '../../constants/admin-roles.js';
import upload from '../../config/multer/multer.js';
import { requireAuth } from '../../middlewares/auth/require-auth.js';
import { authorizeRoles } from '../../middlewares/auth/authorize-roles.js';
import {
  validateImageFiles,
  validateUpdateImage,
  validateReorderImages,
  validateImageId,
} from '../../utils/validations/product-images/product-image.validation.js';
import { validateProductId } from '../../utils/validations/products/product.validation.js';
import productImageService from '../../services/product-images/product-image.service.js';

const productImageRoutes = express.Router();

// La galeria del producto tambien es administracion interna del panel.
// Reutilizamos la misma barrera: sesion valida primero y rol permitido despues.
productImageRoutes.use(requireAuth);
productImageRoutes.use(authorizeRoles(OWNER_ROLE, STAFF_ROLE));

// Extrae el contexto del sistema/dealer desde los headers que envía el gateway.
// Hoy el gateway aún no envía estos headers, así que todos llegan undefined
// y cloudinary-folder.util.js usa el fallback "default-system".
// Cuando el gateway esté listo, empezará a enviar estos headers automáticamente.
function getSystemContext(req) {
  return {
    systemName: req.headers['x-system-name'],
    systemSlug: req.headers['x-system-slug'],
    tenantName: req.headers['x-tenant-name'],
    tenantSlug: req.headers['x-tenant-slug'],
  };
}

function sendImageError(res, error) {
  return res.status(error.statusCode || 500).json({
    status: error.statusCode || 500,
    error: error.message,
    code: error.code,
  });
}

// Create - Sube 1-30 imágenes a Cloudinary y las asocia al producto en la DB
productImageRoutes.post('/products/:id/images', validateProductId, upload.array('images', 30), validateImageFiles, async (req, res) => {
  try {
    const images = await productImageService.create(req.params.id, req.files, getSystemContext(req));
    res.status(201).json({ status: 201, data: images });
  } catch (error) {
    return sendImageError(res, error);
  }
});

// Read All - Obtiene todas las imágenes de un producto (ordenadas por sort_order)
productImageRoutes.get('/products/:id/images', validateProductId, async (req, res) => {
  try {
    const images = await productImageService.getByProductId(req.params.id);
    res.status(200).json({ status: 200, data: images });
  } catch (error) {
    return sendImageError(res, error);
  }
});

productImageRoutes.put('/products/:id/images/reorder', validateProductId, validateReorderImages, async (req, res) => {
  try {
    const images = await productImageService.reorder(req.params.id, req.body.orderedImageIds);
    return res.status(200).json({ status: 200, data: images });
  } catch (error) {
    return sendImageError(res, error);
  }
});

// Read One - Obtiene una imagen específica, validando que pertenezca al producto
productImageRoutes.get('/products/:id/images/:imageId', validateProductId, validateImageId, async (req, res) => {
  try {
    const image = await productImageService.getById(req.params.id, req.params.imageId);
    res.status(200).json({ status: 200, data: image });
  } catch (error) {
    return sendImageError(res, error);
  }
});

// Update - Actualiza sort_order y/o is_cover de una imagen del producto
productImageRoutes.put('/products/:id/images/:imageId', validateProductId, validateImageId, validateUpdateImage, async (req, res) => {
  try {
    const image = await productImageService.update(req.params.id, req.params.imageId, req.body);
    res.status(200).json({ status: 200, data: image });
  } catch (error) {
    return sendImageError(res, error);
  }
});

// Delete - Elimina la imagen de Cloudinary y su registro en la DB
productImageRoutes.delete('/products/:id/images/:imageId', validateProductId, validateImageId, async (req, res) => {
  try {
    const image = await productImageService.delete(req.params.id, req.params.imageId);
    res.status(200).json({ status: 200, data: image });
  } catch (error) {
    return sendImageError(res, error);
  }
});

export default productImageRoutes;
