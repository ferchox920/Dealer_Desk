import express from 'express';
import { validateCreateImage, validateImageId } from '../../../validations/admin/listings-images/listing-image.validation.js';
import { validateListingId } from '../../../validations/admin/listings/listing.validation.js';
import listingImageService from '../../../services/admin/listings-images/listing-image.service.js';

const listingImageRoutes = express.Router();

// Create - Agregar imagen a un listing
listingImageRoutes.post('/listings/:id/images', validateListingId, validateCreateImage, async (req, res) => {
  try {
    const image = await listingImageService.create({ ...req.body, listing_id: Number(req.params.id) });
    res.status(201).json({ success: true, data: image });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'IMAGE_CREATE_FAILED', message: 'Failed to create image.' } });
  }
});

// Read - Obtener todas las imágenes de un listing
listingImageRoutes.get('/listings/:id/images', validateListingId, async (req, res) => {
  try {
    const images = await listingImageService.getByListingId(Number(req.params.id));
    res.status(200).json({ success: true, data: images });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'IMAGE_GET_ALL_FAILED', message: 'Failed to get images.' } });
  }
});

// Read - Obtener una imagen por ID
listingImageRoutes.get('/listings/:id/images/:imageId', validateListingId, validateImageId, async (req, res) => {
  try {
    const image = await listingImageService.getById(Number(req.params.imageId));

    if (!image) {
      return res.status(404).json({ success: false, error: { code: 'IMAGE_NOT_FOUND', message: 'Image not found.' } });
    }

    res.status(200).json({ success: true, data: image });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'IMAGE_GET_FAILED', message: 'Failed to get image.' } });
  }
});

// Actualizar una imagen (sort_order, is_cover)
listingImageRoutes.put('/listings/:id/images/:imageId', validateListingId, validateImageId, validateCreateImage, async (req, res) => {
  try {
    const image = await listingImageService.update(Number(req.params.imageId), req.body);

    if (!image) {
      return res.status(404).json({ success: false, error: { code: 'IMAGE_NOT_FOUND', message: 'Image not found.' } });
    }

    res.status(200).json({ success: true, data: image });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'IMAGE_UPDATE_FAILED', message: 'Failed to update image.' } });
  }
});

// Eliminar una imagen de un listing
listingImageRoutes.delete('/listings/:id/images/:imageId', validateListingId, validateImageId, async (req, res) => {
  try {
    const image = await listingImageService.delete(Number(req.params.imageId));

    if (!image) {
      return res.status(404).json({ success: false, error: { code: 'IMAGE_NOT_FOUND', message: 'Image not found.' } });
    }

    res.status(200).json({ success: true, data: image });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'IMAGE_DELETE_FAILED', message: 'Failed to delete image.' } });
  }
});

export default listingImageRoutes;
