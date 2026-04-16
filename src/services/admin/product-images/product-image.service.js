// ============================================================================
// product-image.service.js
//
// Lógica de negocio para imágenes de productos.
// Coordina entre Cloudinary (almacenamiento de archivos) y PostgreSQL (metadatos).
//
// Flujo de subida (create):
//   1. Verifica que el producto exista
//   2. Sube todas las imágenes a Cloudinary en paralelo (Promise.allSettled)
//   3. Guarda todos los metadatos en PostgreSQL con UN solo INSERT (bulkCreate)
//   4. Si algo falla, limpia Cloudinary y la transacción hace rollback
//
// Reglas de portada:
//   - La primera imagen de un producto se marca automáticamente como portada
//   - Si se elimina la portada, la siguiente imagen más antigua asume el rol
//   - Si se cambia la portada, las demás se desmarcan (clearCoverByProductId)
// ============================================================================

import ProductImage from '../../../entities/product-image.entity.js';
import Product from '../../../entities/product.entity.js';
import cloudinary from '../../../config/cloudinary/cloudinary.js';
import db from '../../../config/db/db.js';
import { buildProductImagesFolder } from '../../../utils/cloudinary/cloudinary-folder.util.js';
import { destroyCloudinaryAssetsBestEffort } from '../../../utils/cloudinary/destroy-cloudinary-assets.util.js';
import { createHttpError } from '../../../utils/errors/app-error.util.js';

class ProductImageService {

  // Estrategia actual:
  // 1) subir varias imágenes a Cloudinary en paralelo (Promise.allSettled)
  //    - allSettled NO falla si una imagen falla, las demás siguen subiendo
  //    - después revisamos cuáles se subieron y cuáles no
  // 2) guardar todos los metadatos en PostgreSQL con un solo INSERT masivo
  //    - esto va dentro de db.withTransaction para que si falla, haga rollback
  //    - executor = client.query.bind(client) para que las entities usen la transacción
  // 3) si CUALQUIER subida falla, se borran las que sí se subieron de Cloudinary
  //
  // systemContext viene de los headers del gateway (x-system-slug, etc.)
  // y se usa para organizar las carpetas en Cloudinary por dealer/sistema.
  // Hoy llega vacío porque el gateway aún no envía esos headers,
  // así que la carpeta cae en "default-system" (ver cloudinary-folder.util.js).
  async create(productId, files, systemContext = {}) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw createHttpError(404, 'Product not found.', 'PRODUCT_NOT_FOUND');
    }
    const folder = buildProductImagesFolder({ ...systemContext, productId });

    // Subida a Cloudinary: convierte cada archivo de memoria (buffer) a base64
    // y lo sube. El formato data:mimetype;base64,... es lo que Cloudinary espera
    // cuando no le das una URL ni un path de disco.
    const uploadResults = await Promise.allSettled(
      files.map((file) =>
        cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          { folder }
        ),
      ),
    );

    // Separar exitosas de fallidas
    const uploadedImages = uploadResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);

    const failedUpload = uploadResults.find((result) => result.status === 'rejected');

    try {
      if (failedUpload) {
        throw failedUpload.reason;
      }

      return await db.withTransaction(async (client) => {
        const executor = client.query.bind(client);
        const nextSortOrder = await ProductImage.countByProductId(productId, executor);
        const hasExistingImages = nextSortOrder > 0;

        const recordsToInsert = uploadedImages.map((result, index) => ({
          product_id: productId,
          cloudinary_public_id: result.public_id,
          url: result.secure_url,
          sort_order: nextSortOrder + index,
          // Solo la primera imagen absoluta del producto queda como portada por defecto.
          is_cover: !hasExistingImages && index === 0,
        }));

        return await ProductImage.bulkCreate(recordsToInsert, executor);
      });
    } catch (error) {
      // Si falla una subida o el INSERT masivo, limpiamos Cloudinary y la transaccion hace rollback.
      await Promise.all(
        uploadedImages.map((image) => cloudinary.uploader.destroy(image.public_id).catch(() => null)),
      );

      throw error;
    }
  }

  // Obtiene todas las imágenes de un producto, ordenadas por posición en la galería
  async getByProductId(productId) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw createHttpError(404, 'Product not found.', 'PRODUCT_NOT_FOUND');
    }

    return await ProductImage.findAll({
      where: { product_id: productId },
      order: [['sort_order', 'ASC']],
    });
  }

  // Obtiene una imagen por su ID, verificando que pertenezca al producto indicado
  async getById(productId, imageId) {
    const image = await ProductImage.findByPk(imageId);
    if (!image) {
      throw createHttpError(404, 'Image not found.', 'IMAGE_NOT_FOUND');
    }

    if (image.product_id !== productId) {
      throw createHttpError(404, 'Image does not belong to this product.', 'IMAGE_PRODUCT_MISMATCH');
    }

    return image;
  }

  // Actualiza campos editables de una imagen (sort_order, is_cover)
  async update(productId, imageId, data) {
    const image = await ProductImage.findByPk(imageId);
    if (!image) {
      throw createHttpError(404, 'Image not found.', 'IMAGE_NOT_FOUND');
    }

    if (image.product_id !== productId) {
      throw createHttpError(404, 'Image does not belong to this product.', 'IMAGE_PRODUCT_MISMATCH');
    }

    // Si una imagen pasa a ser portada, las demas del mismo producto dejan de serlo.
    if (data.is_cover === true) {
      return await db.withTransaction(async (client) => {
        const executor = client.query.bind(client);

        await ProductImage.clearCoverByProductId(productId, executor);
        return await ProductImage.update(imageId, data, executor);
      });
    }

    return await ProductImage.update(imageId, data);
  }

  async reorder(productId, orderedImageIds) {
    const product = await Product.findByPk(productId);

    if (!product) {
      throw createHttpError(404, 'Product not found.', 'PRODUCT_NOT_FOUND');
    }

    const images = await ProductImage.findAll({
      where: { product_id: productId },
      order: [['sort_order', 'ASC']],
    });

    if (images.length === 0) {
      throw createHttpError(409, 'This product has no images to reorder.', 'PRODUCT_HAS_NO_IMAGES');
    }

    const currentIds = images.map((image) => image.id);
    const hasSameLength = currentIds.length === orderedImageIds.length;
    const hasDuplicates = new Set(orderedImageIds).size !== orderedImageIds.length;
    const includesUnknownId = orderedImageIds.some((imageId) => !currentIds.includes(imageId));

    if (!hasSameLength || hasDuplicates || includesUnknownId) {
      throw createHttpError(
        400,
        'orderedImageIds must include each product image exactly once.',
        'IMAGE_REORDER_INVALID_ORDER',
      );
    }

    await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);

      await ProductImage.clearCoverByProductId(productId, executor);

      for (const [index, imageId] of orderedImageIds.entries()) {
        await ProductImage.update(imageId, {
          sort_order: index,
          is_cover: index === 0,
        }, executor);
      }
    });

    return await ProductImage.findAll({
      where: { product_id: productId },
      order: [['sort_order', 'ASC']],
    });
  }

  // Elimina la imagen de Cloudinary y su registro en la DB.
  // Si la imagen eliminada era la portada, promueve automáticamente
  // la primera imagen restante (por sort_order) como nueva portada.
  async delete(productId, imageId) {
    const image = await ProductImage.findByPk(imageId);
    if (!image) {
      throw createHttpError(404, 'Image not found.', 'IMAGE_NOT_FOUND');
    }

    if (image.product_id !== productId) {
      throw createHttpError(404, 'Image does not belong to this product.', 'IMAGE_PRODUCT_MISMATCH');
    }

    const deletedImage = await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const removedImage = await ProductImage.deleteById(imageId, executor);

      if (!removedImage) {
        throw createHttpError(404, 'Image not found.', 'IMAGE_NOT_FOUND');
      }

      // Si se elimina la portada y aun quedan imagenes, promovemos la primera como nueva portada.
      if (removedImage.is_cover) {
        const nextCover = await ProductImage.findFirstByProductId(productId, executor);
        if (nextCover) {
          await ProductImage.update(nextCover.id, { is_cover: true }, executor);
        }
      }

      return removedImage;
    });

    await destroyCloudinaryAssetsBestEffort(
      [deletedImage.cloudinary_public_id],
      `product image ${imageId}`,
    );

    return deletedImage;
  }

}

export default new ProductImageService();
