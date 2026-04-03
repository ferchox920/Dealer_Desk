// ============================================================================
// product.service.js
//
// Lógica de negocio para productos.
// Coordina entre la entidad Product y Cloudinary (para limpiar imágenes al borrar).
//
// Nota importante sobre delete:
//   PostgreSQL borra las filas de product_images automáticamente (ON DELETE CASCADE),
//   pero los archivos en Cloudinary NO se borran solos. Por eso el service
//   primero destruye cada imagen en Cloudinary y luego borra el producto.
// ============================================================================

import Product from '../../../entities/product.entity.js';
import ProductImage from '../../../entities/product-image.entity.js';
import cloudinary from '../../../config/cloudinary/cloudinary.js';

class ProductService {

  // Le falta la lógica de validación de datos (ej: año no puede ser futuro, precio positivo, etc) que se puede agregar en el controller o en un service aparte
  async create(data) {
    return await Product.create(data);
  }

  // Trae todos los productos con su imagen de portada (is_cover: true).
  // El "required: false" es estilo Sequelize: si no tiene portada, igual aparece el producto.
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

  // Trae un producto con TODAS sus imágenes, ordenadas por sort_order.
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

  // Elimina un producto. Primero limpia las imágenes de Cloudinary
  // y luego borra el producto (CASCADE se encarga de las filas en product_images).
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


