import express from 'express';
import upload from '../../../config/multer/multer.js';
import { validateImageFiles, validateUpdateImage, validateImageId } from '../../../utils/validations/admin/product-images/product-image.validation.js';
import { validateProductId } from '../../../utils/validations/admin/products/product.validation.js';
import productImageService from '../../../services/admin/product-images/product-image.service.js';

const productImageRoutes = express.Router();

// Create - Sube 1-10 imágenes a Cloudinary y las asocia al producto en la DB
productImageRoutes.post('/products/:id/images', validateProductId, upload.array('images', 10), validateImageFiles, async (req, res) => {
  try {
    const images = await productImageService.create(req.params.id, req.files);
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
