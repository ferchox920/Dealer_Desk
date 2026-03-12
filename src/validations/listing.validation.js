function validateCreateListing(req, res, next) {
  const errors = [];
  const body = req.body;

  // --- year (number) ---
  if (body.year !== undefined && typeof body.year !== 'number') {
    errors.push({ code: 'LISTING_YEAR_NOT_NUMBER', field: 'year', message: 'The year must be a number.' });
  }

  // --- brand (string) ---
  if (body.brand !== undefined && typeof body.brand !== 'string') {
    errors.push({ code: 'LISTING_BRAND_NOT_STRING', field: 'brand', message: 'The brand must be a string.' });
  }

  // --- model (string) ---
  if (body.model !== undefined && typeof body.model !== 'string') {
    errors.push({ code: 'LISTING_MODEL_NOT_STRING', field: 'model', message: 'The model must be a string.' });
  }

  // --- mileage (number) ---
  if (body.mileage !== undefined && typeof body.mileage !== 'number') {
    errors.push({ code: 'LISTING_MILEAGE_NOT_NUMBER', field: 'mileage', message: 'The mileage must be a number.' });
  }

  // --- price (number) ---
  if (body.price !== undefined && typeof body.price !== 'number') {
    errors.push({ code: 'LISTING_PRICE_NOT_NUMBER', field: 'price', message: 'The price must be a number.' });
  }

  // --- drive_train (string) ---
  if (body.drive_train !== undefined && typeof body.drive_train !== 'string') {
    errors.push({ code: 'LISTING_DRIVE_TRAIN_NOT_STRING', field: 'drive_train', message: 'The drive_train must be a string.' });
  }

  // --- fuel_type (string) ---
  if (body.fuel_type !== undefined && typeof body.fuel_type !== 'string') {
    errors.push({ code: 'LISTING_FUEL_TYPE_NOT_STRING', field: 'fuel_type', message: 'The fuel_type must be a string.' });
  }

  // --- vin_number (string) ---
  if (body.vin_number !== undefined && typeof body.vin_number !== 'string') {
    errors.push({ code: 'LISTING_VIN_NOT_STRING', field: 'vin_number', message: 'The vin_number must be a string.' });
  }

  // --- description (string) ---
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push({ code: 'LISTING_DESCRIPTION_NOT_STRING', field: 'description', message: 'The description must be a string.' });
  }

  // --- photos (array of strings) ---
  if (body.photos !== undefined && !Array.isArray(body.photos)) {
    errors.push({ code: 'LISTING_PHOTOS_NOT_ARRAY', field: 'photos', message: 'The photos must be an array.' });
  }

  // --- respuesta ---
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

export { validateCreateListing };
