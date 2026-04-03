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
import upload from '../../../config/multer/multer.js';
import { validateImageFiles, validateUpdateImage, validateImageId } from '../../../utils/validations/admin/product-images/product-image.validation.js';
import { validateProductId } from '../../../utils/validations/admin/products/product.validation.js';
import productImageService from '../../../services/admin/product-images/product-image.service.js';

const productImageRoutes = express.Router();

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

// Create - Sube 1-30 imágenes a Cloudinary y las asocia al producto en la DB
productImageRoutes.post('/products/:id/images', validateProductId, upload.array('images', 30), validateImageFiles, async (req, res) => {
  try {
    const images = await productImageService.create(req.params.id, req.files, getSystemContext(req));
    res.status(201).json({ status: 201, data: images });
  } catch (error) {
    res.status(404).json({ status: 404, error: error.message });
  }
});

// Read All - Obtiene todas las imágenes de un producto (ordenadas por sort_order)
productImageRoutes.get('/products/:id/images', validateProductId, async (req, res) => {
  try {
    const images = await productImageService.getByProductId(req.params.id);
    res.status(200).json({ status: 200, data: images });
  } catch (error) {
    res.status(404).json({ status: 404, error: error.message });
  }
});

// Read One - Obtiene una imagen específica, validando que pertenezca al producto
productImageRoutes.get('/products/:id/images/:imageId', validateProductId, validateImageId, async (req, res) => {
  try {
    const image = await productImageService.getById(req.params.id, req.params.imageId);
    res.status(200).json({ status: 200, data: image });
  } catch (error) {
    res.status(404).json({ status: 404, error: error.message });
  }
});

// Update - Actualiza sort_order y/o is_cover de una imagen del producto
productImageRoutes.put('/products/:id/images/:imageId', validateProductId, validateImageId, validateUpdateImage, async (req, res) => {
  try {
    const image = await productImageService.update(req.params.id, req.params.imageId, req.body);
    res.status(200).json({ status: 200, data: image });
  } catch (error) {
    res.status(404).json({ status: 404, error: error.message });
  }
});

// Delete - Elimina la imagen de Cloudinary y su registro en la DB
productImageRoutes.delete('/products/:id/images/:imageId', validateProductId, validateImageId, async (req, res) => {
  try {
    const image = await productImageService.delete(req.params.id, req.params.imageId);
    res.status(200).json({ status: 200, data: image });
  } catch (error) {
    res.status(404).json({ status: 404, error: error.message });
  }
});

export default productImageRoutes;
