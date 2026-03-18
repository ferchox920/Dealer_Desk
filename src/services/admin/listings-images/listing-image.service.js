class ListingImageService {

  constructor() {
    // Almacenamiento temporal en memoria (reemplazar por BD)
    this.images = [];
    this.currentId = 1;
  }

  // Create - Agregar una imagen a un listing
  async create({ listing_id, cloudinary_public_id, url, sort_order, is_cover }) {
    const image = {
      id: this.currentId++,
      listing_id,
      cloudinary_public_id,
      url,
      sort_order: sort_order || 0,
      is_cover: is_cover || false,
      created_at: new Date().toISOString(),
    };

    this.images.push(image);

    console.log('Image created:', image);

    return image;
  }

  // Read - Obtener todas las imágenes de un listing
  async getByListingId(listingId) {
    return this.images.filter(image => image.listing_id === listingId);
  }

  // Read - Obtener una imagen por ID
  async getById(id) {
    const image = this.images.find(image => image.id === id);
    return image || null;
  }

  // Update - Actualizar una imagen por ID
  async update(id, { sort_order, is_cover }) {
    const index = this.images.findIndex(image => image.id === id);

    if (index === -1) {
      return null;
    }

    const existing = this.images[index];

    const updated = {
      ...existing,
      sort_order: sort_order !== undefined ? sort_order : existing.sort_order,
      is_cover: is_cover !== undefined ? is_cover : existing.is_cover,
      updated_at: new Date().toISOString(),
    };

    this.images[index] = updated;

    console.log('Image updated:', updated);

    return updated;
  }

  // Delete - Eliminar una imagen por ID
  async delete(id) {
    const index = this.images.findIndex(image => image.id === id);

    if (index === -1) {
      return null;
    }

    const deleted = this.images.splice(index, 1)[0];

    console.log('Image deleted:', deleted);

    return deleted;
  }

}

export default new ListingImageService();
