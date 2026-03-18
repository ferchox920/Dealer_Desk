import express from 'express';
import { validateCreateListing, validateListingId } from '../../../validations/admin/listings/listing.validation.js';
import listingService from '../../../services/admin/listings/listing.service.js';

const listingRoutes = express.Router();

// Create listing
listingRoutes.post('/listings', validateCreateListing, async (req, res) => {
  try {
    const listing = await listingService.create(req.body);
    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'LISTING_CREATE_FAILED', message: 'Failed to create listing.' } });
  }
});

// Obtener todos los listings 
listingRoutes.get('/listings', async (req, res) => {
  try {
    const listings = await listingService.getAll();
    res.status(200).json({ success: true, data: listings });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'LISTING_GET_ALL_FAILED', message: 'Failed to get listings.' } });
  }
});

// Obtener un listing por ID
listingRoutes.get('/listings/:id', validateListingId, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const listing = await listingService.getById(id);

    if (!listing) {
      return res.status(404).json({ success: false, error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found.' } });
    }

    res.status(200).json({ success: true, data: listing });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'LISTING_GET_FAILED', message: 'Failed to get listing.' } });
  }
});

// Update listing por ID
listingRoutes.put('/listings/:id', validateListingId, validateCreateListing, async (req, res) => {
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

// Delete listing por ID
listingRoutes.delete('/listings/:id', validateListingId, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const listing = await listingService.delete(id);

    if (!listing) {
      return res.status(404).json({ success: false, error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found.' } });
    }

    res.status(200).json({ success: true, data: listing });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'LISTING_DELETE_FAILED', message: 'Failed to delete listing.' } });
  }
});

export default listingRoutes;
