class ListingService {

  constructor() {
    // Almacenamiento temporal en memoria (reemplazar por BD)
    this.listings = [];
    this.currentId = 1;
  }

  // Crear un nuevo listing
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

    console.log('Listing created:', listing);

    return listing;
  }


  // Obtener todos los listings
  async getAll() {
    return this.listings;
  }


  // Obtener un listing por ID
  async getById(id) {
    const listing = this.listings.find(listing => listing.id === id);
    return listing || null;
  }


  // Actualizar un listing existente por ID
  async update(id, { year, brand, model, mileage, price, drive_train, fuel_type, vin_number, description, photos }) {
    const index = this.listings.findIndex(listing => listing.id === id);

    if (index === -1) {
      return null;
    }

    const existing = this.listings[index];

    const updated = {
      ...existing,
      year: year !== undefined ? year : existing.year,
      brand: brand !== undefined ? brand : existing.brand,
      model: model !== undefined ? model : existing.model,
      mileage: mileage !== undefined ? mileage : existing.mileage,
      price: price !== undefined ? price : existing.price,
      drive_train: drive_train !== undefined ? drive_train : existing.drive_train,
      fuel_type: fuel_type !== undefined ? fuel_type : existing.fuel_type,
      vin_number: vin_number !== undefined ? vin_number : existing.vin_number,
      description: description !== undefined ? description : existing.description,
      photos: photos !== undefined ? photos : existing.photos,
      updated_at: new Date().toISOString(),
    };

    this.listings[index] = updated;

    console.log('Listing updated:', updated);

    return updated;
  }

  // Eliminar un listing por ID
  async delete(id) {
    const index = this.listings.findIndex(listing => listing.id === id);

    if (index === -1) {
      return null;
    }

    // Elimina 1 elemento en la posición encontrada y lo retorna
    const deleted = this.listings.splice(index, 1)[0];

    console.log('Listing deleted:', deleted);

    return deleted;
  }

}





export default new ListingService();


