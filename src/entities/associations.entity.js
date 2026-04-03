import Product from './product.entity.js';
import ProductImage from './product-image.entity.js';

// En Sequelize este archivo declaraba asociaciones entre modelos.
// Ahora la relacion real vive en PostgreSQL, en la foreign key:
// product_images.product_id -> products.id
// Este archivo solo reexporta entidades para mantener una entrada conocida.
export { Product, ProductImage };
