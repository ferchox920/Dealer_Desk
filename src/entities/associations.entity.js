import Product from './product.entity.js';
import ProductImage from './product-image.entity.js';

// Product 1:N ProductImage (diagrama: listings → listings_images)
Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

export { Product, ProductImage };
