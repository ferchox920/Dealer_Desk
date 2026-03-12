class ListingService {

  constructor() {
    // Almacenamiento temporal en memoria (reemplazar por BD)
    this.listings = [];
    this.currentId = 1;
  }

  async create({ year, brand, model, mileage, price, drive_train, fuel_type, vin_number, description, photos }) {
    const listing = {
      id: this.currentId++,
      year,
      brand,
      model,
      mileage,
      price,
      drive_train,
      fuel_type,
      vin_number,
      description,
      photos: photos || [],
      created_at: new Date().toISOString(),
    };

    this.listings.push(listing);

    return listing;
  }

}

export default new ListingService();
