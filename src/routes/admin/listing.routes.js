import express from 'express';
import { validateCreateListing, validateUpdateListing } from '../../validations/listing.validation.js';
import listingService from '../../services/admin/listing.service.js';

const listingRoutes = express.Router();

listingRoutes.post('/listings', validateCreateListing, async (req, res) => {
  try {
    const listing = await listingService.create(req.body);
    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'LISTING_CREATE_FAILED', message: 'Failed to create listing.' } });
  }
});

listingRoutes.put('/listings/:id', validateUpdateListing, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const listing = await listingService.update(id, req.body);

    if (!listing) {
      return res.status(404).json({ success: false, error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found.' } });
    }

    res.status(200).json({ success: true, data: listing });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'LISTING_UPDATE_FAILED', message: 'Failed to update listing.' } });
  }
});

export default listingRoutes;
