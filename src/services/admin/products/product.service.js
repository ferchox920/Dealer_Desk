import Product from '../../../entities/product.entity.js';
import ProductImage from '../../../entities/product-image.entity.js';
import cloudinary from '../../../config/cloudinary/cloudinary.js';

class ProductService {

  // Le falta la lógica de validación de datos (ej: año no puede ser futuro, precio positivo, etc) que se puede agregar en el controller o en un service aparte
  async create(data) {
    return await Product.create(data);
  }

  async getAll() {
    return await Product.findAll({
      include: [{
        model: ProductImage,
        as: 'images',
        where: { is_cover: true },
        required: false,
      }],
    });
  }

  async getById(id) {
    const product = await Product.findByPk(id, {
      include: [{
        model: ProductImage,
        as: 'images',
      }],
      order: [[{ model: ProductImage, as: 'images' }, 'sort_order', 'ASC']],
    });
    if (!product) throw new Error('Product not found.');
    return product;
  }

  async update(id, data) {
    const product = await Product.findByPk(id);
    if (!product) throw new Error('Product not found.');
    return await product.update(data);
  }

  async delete(id) {
    const product = await Product.findByPk(id);
    if (!product) throw new Error('Product not found.');

    // Limpiar imágenes de Cloudinary antes del CASCADE
    const images = await ProductImage.findAll({ where: { product_id: id } });
    for (const img of images) {
      await cloudinary.uploader.destroy(img.cloudinary_public_id);
    }

    await product.destroy();
    return product;
  }

}





export default new ProductService();


