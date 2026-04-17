import {
  DEFAULT_PRODUCT_CURRENCY,
  getProductPriceRange,
  normalizeProductCurrencyCode,
} from '../../constants/product-ranges.js';
import Product from '../../entities/product.entity.js';
import ProductImage from '../../entities/product-image.entity.js';
import db from '../../config/db/db.js';
import { createHttpError } from '../../utils/errors/app-error.util.js';
import {
  serializePublicCatalogCard,
  serializePublicCatalogDetail,
} from '../../utils/serializers/public-product.serializer.js';
import { destroyCloudinaryAssetsBestEffort } from '../../utils/cloudinary/destroy-cloudinary-assets.util.js';

function buildPriceOutOfRangeMessage(currencyCode, range) {
  return `The price must be between ${range.min} and ${range.max} for ${currencyCode}.`;
}

function assertPriceWithinCurrencyRange(currencyCode, price) {
  if (price === undefined) {
    return;
  }

  const priceRange = getProductPriceRange(currencyCode);

  if (!priceRange) {
    throw createHttpError(400, 'The currency_code must be CLP or USD.', 'PRODUCT_CURRENCY_CODE_INVALID');
  }

  if (price < priceRange.min || price > priceRange.max) {
    throw createHttpError(
      400,
      buildPriceOutOfRangeMessage(currencyCode, priceRange),
      'PRODUCT_PRICE_OUT_OF_RANGE',
    );
  }
}

class ProductService {
  serializePublicCards(products) {
    return products.map((item) => serializePublicCatalogCard(item));
  }

  async requireProduct(id) {
    const product = await Product.findByPk(id);

    if (!product) {
      throw createHttpError(404, 'Product not found.', 'PRODUCT_NOT_FOUND');
    }

    return product;
  }

  async create(data) {
    const {
      internal_code: _internalCode,
      publish_status: _publishStatus,
      sale_status: _saleStatus,
      ...safeData
    } = data;
    const effectiveCurrency = normalizeProductCurrencyCode(
      safeData.currency_code,
      DEFAULT_PRODUCT_CURRENCY,
    );

    assertPriceWithinCurrencyRange(effectiveCurrency, safeData.price);

    return await Product.create({
      ...safeData,
      currency_code: effectiveCurrency,
    });
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

  async getPublicCatalog(filters = {}) {
    const result = await Product.findPublicCatalog({
      ...filters,
      include: [{
        model: ProductImage,
        as: 'images',
        where: { is_cover: true },
        required: false,
      }],
    });

    return {
      items: this.serializePublicCards(result.items),
      pagination: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 24,
        total: result.total,
        total_pages: Math.max(1, Math.ceil(result.total / (filters.limit ?? 24))),
      },
      sort: {
        by: filters.sort_by ?? 'created_at',
        direction: filters.sort_direction ?? 'desc',
      },
      filters: {
        brand: filters.brand ?? null,
        model: filters.model ?? null,
        currency_code: filters.currency_code ?? null,
        year_from: filters.year_from ?? null,
        year_to: filters.year_to ?? null,
        price_min: filters.price_min ?? null,
        price_max: filters.price_max ?? null,
      },
    };
  }

  async getPublicById(id) {
    const product = await Product.findPublicByPk(id, {
      include: [{
        model: ProductImage,
        as: 'images',
      }],
      order: [[{ model: ProductImage, as: 'images' }, 'sort_order', 'ASC']],
    });

    if (!product) {
      throw createHttpError(404, 'Public product not found.', 'PUBLIC_PRODUCT_NOT_FOUND');
    }

    return serializePublicCatalogDetail(product);
  }

  async getPublicFeatured(limit = 6) {
    const products = await Product.findPublicFeatured({
      limit,
      include: [{
        model: ProductImage,
        as: 'images',
        where: { is_cover: true },
        required: false,
      }],
    });

    return this.serializePublicCards(products);
  }

  async getPublicRecent(limit = 6) {
    const products = await Product.findPublicRecent({
      limit,
      include: [{
        model: ProductImage,
        as: 'images',
        where: { is_cover: true },
        required: false,
      }],
    });

    return this.serializePublicCards(products);
  }

  async getPublicSimilar(id, limit = 4) {
    const baseProduct = await Product.findPublicByPk(id);

    if (!baseProduct) {
      throw createHttpError(404, 'Public product not found.', 'PUBLIC_PRODUCT_NOT_FOUND');
    }

    const similarProducts = await Product.findPublicSimilar({
      productId: id,
      brand: baseProduct.brand,
      model: baseProduct.model,
      year: baseProduct.year,
      limit,
      include: [{
        model: ProductImage,
        as: 'images',
        where: { is_cover: true },
        required: false,
      }],
    });

    return this.serializePublicCards(similarProducts);
  }

  async getPublicBrands() {
    return await Product.findPublicBrands();
  }

  async getPublicModels(brand) {
    return await Product.findPublicModelsByBrand(brand);
  }

  async getById(id) {
    const product = await Product.findByPk(id, {
      include: [{
        model: ProductImage,
        as: 'images',
      }],
      order: [[{ model: ProductImage, as: 'images' }, 'sort_order', 'ASC']],
    });

    if (!product) {
      throw createHttpError(404, 'Product not found.', 'PRODUCT_NOT_FOUND');
    }

    return product;
  }

  async update(id, data) {
    const product = await this.requireProduct(id);
    const {
      publish_status: _publishStatus,
      sale_status: _saleStatus,
      internal_code: _internalCode,
      ...safeData
    } = data;
    const effectiveCurrency = normalizeProductCurrencyCode(
      safeData.currency_code,
      product.currency_code || DEFAULT_PRODUCT_CURRENCY,
    );
    const effectivePrice = safeData.price ?? product.price;

    assertPriceWithinCurrencyRange(effectiveCurrency, effectivePrice);

    return await product.update({
      ...safeData,
      currency_code: safeData.currency_code !== undefined
        ? effectiveCurrency
        : safeData.currency_code,
    });
  }

  async publish(id) {
    const product = await this.requireProduct(id);

    if (product.sale_status === 'unavailable') {
      throw createHttpError(
        409,
        'Activate the product before publishing it.',
        'PRODUCT_INACTIVE_CANNOT_PUBLISH',
      );
    }

    return await product.update({
      publish_status: 'published',
    });
  }

  async unpublish(id) {
    const product = await this.requireProduct(id);

    return await product.update({
      publish_status: 'draft',
    });
  }

  async activate(id) {
    const product = await this.requireProduct(id);

    if (product.sale_status !== 'unavailable') {
      throw createHttpError(
        409,
        'Only inactive products can be activated again.',
        'PRODUCT_ACTIVATE_REQUIRES_INACTIVE',
      );
    }

    return await product.update({
      publish_status: 'draft',
      sale_status: 'available',
    });
  }

  async inactivate(id) {
    const product = await this.requireProduct(id);

    return await product.update({
      publish_status: 'draft',
      sale_status: 'unavailable',
    });
  }

  async markSold(id) {
    const product = await this.requireProduct(id);

    if (product.sale_status === 'unavailable') {
      throw createHttpError(
        409,
        'Inactive products cannot be marked as sold.',
        'PRODUCT_INACTIVE_CANNOT_BE_SOLD',
      );
    }

    return await product.update({
      sale_status: 'sold',
    });
  }

  async markAvailable(id) {
    const product = await this.requireProduct(id);

    if (product.sale_status === 'unavailable') {
      throw createHttpError(
        409,
        'Inactive products must be activated before they can become available.',
        'PRODUCT_INACTIVE_CANNOT_BE_AVAILABLE',
      );
    }

    return await product.update({
      sale_status: 'available',
    });
  }

  async delete(id) {
    const product = await this.requireProduct(id);

    if (product.sale_status !== 'unavailable') {
      throw createHttpError(
        409,
        'Inactivate the product before deleting it.',
        'PRODUCT_DELETE_REQUIRES_INACTIVE',
      );
    }

    const { deletedProduct, deletedImages } = await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const images = await ProductImage.findAll({ where: { product_id: id } }, executor);
      const deletedRecord = await Product.deleteById(id, executor);

      if (!deletedRecord) {
        throw createHttpError(404, 'Product not found.', 'PRODUCT_NOT_FOUND');
      }

      return {
        deletedProduct: deletedRecord,
        deletedImages: images,
      };
    });

    await destroyCloudinaryAssetsBestEffort(
      deletedImages.map((image) => image.cloudinary_public_id),
      `product ${id} image`,
    );

    return deletedProduct;
  }
}

export default new ProductService();
