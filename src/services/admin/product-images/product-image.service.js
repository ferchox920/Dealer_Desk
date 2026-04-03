import ProductImage from '../../../entities/product-image.entity.js';
import Product from '../../../entities/product.entity.js';
import cloudinary from '../../../config/cloudinary/cloudinary.js';

class ProductImageService {

  // Sube archivos a Cloudinary y guarda los registros en la DB
  async create(productId, files) {
    const product = await Product.findByPk(productId);
    if (!product) throw new Error('Product not found.');

    const images = [];
    
    for (const file of files) {
      // esto entre try y catch para manejar errores individuales de subida sin afectar el batch completo
      // Si hay un error en la subida de la imagen hacia cloudinary entonces rollback
      const result = await cloudinary.uploader.upload(
      // Subir buffer a Cloudinary como base64
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        // Las carpetas del producto tengan su propia carpetas segun productos y empresas
        { folder: 'dealer_desk/products' }
      );
      // tambien try catch
      // crear un pool de conexiones a DB (pa subir todo en un llamado)
      const image = await ProductImage.create({
        product_id: productId,
        cloudinary_public_id: result.public_id,
        url: result.secure_url,
        sort_order: images.length,
        is_cover: images.length === 0, // la primera imagen es portada por defecto
      });

      images.push(image);
    }
    return images;
  }

  // Obtiene todas las imágenes de un producto, ordenadas por posición en la galería
  async getByProductId(productId) {
    const product = await Product.findByPk(productId);
    if (!product) throw new Error('Product not found.');

    return await ProductImage.findAll({
      where: { product_id: productId },
      order: [['sort_order', 'ASC']],
    });
  }

  // Obtiene una imagen por su ID, verificando que pertenezca al producto indicado
  async getById(productId, imageId) {
    const image = await ProductImage.findByPk(imageId);
    if (!image) throw new Error('Image not found.');
    if (image.product_id !== productId) throw new Error('Image does not belong to this product.');
    return image;
  }

  // Actualiza campos editables de una imagen (sort_order, is_cover)
  async update(productId, imageId, data) {
    const image = await ProductImage.findByPk(imageId);
    if (!image) throw new Error('Image not found.');
    if (image.product_id !== productId) throw new Error('Image does not belong to this product.');
    return await image.update(data);
  }

  // Elimina la imagen de Cloudinary y su registro en la DB
  async delete(productId, imageId) {
    const image = await ProductImage.findByPk(imageId);
    if (!image) throw new Error('Image not found.');
    if (image.product_id !== productId) throw new Error('Image does not belong to this product.');

    await cloudinary.uploader.destroy(image.cloudinary_public_id);
    await image.destroy();
    return image;
  }

}

export default new ProductImageService();
