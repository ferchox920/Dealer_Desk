import express from 'express';
import { validateCreateListing } from '../../validations/listing.validation.js';
import listingService from '../../services/listing.service.js';

const listingRoutes = express.Router();

listingRoutes.post('/listings', validateCreateListing, async (req, res) => {
  try {
    const listing = await listingService.create(req.body);
    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'LISTING_CREATE_FAILED', message: 'Failed to create listing.' } });
  }
});

export default listingRoutes;
