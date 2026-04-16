// ============================================================================
// product.entity.js
//
// Acceso SQL para la tabla "products". Es el equivalente a un Model de Sequelize.
// Cada método ejecuta queries parametrizadas y devuelve objetos con métodos
// .update() y .destroy() adjuntos (gracias a hydrateProduct).
//
// También incluye funciones para cargar imágenes relacionadas, evitando
// el problema N+1 (una query por producto) al hacer un solo SELECT con ANY().
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';
import {
  attachRecordMethods,
  buildInsertParts,
  buildPlaceholder,
  buildUpdateSetClause,
  buildWhereEqualsClause,
} from './helpers.entity.js';

// Columnas que se devuelven en cada SELECT/RETURNING de productos.
// Se reutiliza en todos los métodos para no repetir la lista.
// (En Sequelize esto era automático con attributes o el modelo.)
const PRODUCT_SELECT = `
  id,
  internal_code,
  year,
  brand,
  model,
  mileage,
  price,
  currency_code,
  drive_train,
  fuel_type,
  vin_number,
  description,
  publish_status,
  sale_status,
  created_at,
  updated_at
`;

// Campos que se pueden modificar con update().
// Si alguien intenta meter "id" o "created_at" en un update, se ignora.
// (En Sequelize esto se controlaba con el atributo readOnly o hooks.)
const MUTABLE_FIELDS = [
  'year',
  'brand',
  'model',
  'mileage',
  'price',
  'currency_code',
  'drive_train',
  'fuel_type',
  'vin_number',
  'description',
  'publish_status',
  'sale_status',
];

// Toma una fila cruda de PostgreSQL y le adjunta métodos .update() y .destroy().
// Esto te permite hacer: const p = await Product.findByPk(id); await p.update({...});
// Similar a como los modelos de Sequelize devolvían instancias con métodos.
function hydrateProduct(row) {
  if (!row) return null;

  return attachRecordMethods(row, {
    update: async (data) => Product.update(row.id, data),
    destroy: async () => Product.deleteById(row.id),
  });
}

// Carga las imágenes de un solo producto.
// Se usa en findByPk cuando pides include de imágenes.
// coverOnly=true filtra solo la imagen de portada (is_cover=TRUE).
//
// SQL generado (ejemplo):
//   SELECT ... FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC
//
// En Sequelize esto era: Product.findByPk(id, { include: [{ model: ProductImage }] })
async function loadProductImages(productId, coverOnly = false) {
  const where = buildWhereEqualsClause({ product_id: productId });
  const coverFilter = coverOnly ? 'AND is_cover = TRUE' : '';
  const orderClause = coverOnly ? '' : 'ORDER BY sort_order ASC';

  const { rows } = await query(
    `
      SELECT
        id,
        product_id,
        cloudinary_public_id,
        url,
        sort_order,
        is_cover,
        created_at
      FROM product_images
      WHERE ${where.clause}
      ${coverFilter}
      ${orderClause}
    `,
    where.values,
  );

  return rows;
}

// Carga las imágenes de VARIOS productos en UNA sola query.
// Evita el problema N+1: en vez de hacer 1 query por cada producto,
// hace 1 sola query con WHERE product_id = ANY($1::uuid[]).
//
// ANY($1::uuid[]) es la forma de PostgreSQL de hacer "WHERE x IN (lista)".
// Se le pasa un array de UUIDs y PostgreSQL los filtra todos de una vez.
//
// Después agrupa las imágenes por producto en un Map para asignarlas.
//
// En Sequelize esto se hacía internamente cuando ponías include con eager loading.
async function loadImagesByProductIds(productIds, coverOnly = false) {
  if (productIds.length === 0) {
    return new Map();
  }

  const coverFilter = coverOnly ? 'AND is_cover = TRUE' : '';
  const orderClause = coverOnly ? '' : 'ORDER BY product_id ASC, sort_order ASC';

  const { rows } = await query(
    `
      SELECT
        id,
        product_id,
        cloudinary_public_id,
        url,
        sort_order,
        is_cover,
        created_at
      FROM product_images
      WHERE product_id = ANY(${buildPlaceholder(1)}::uuid[])
      ${coverFilter}
      ${orderClause}
    `,
    [productIds],
  );

  const imagesByProductId = new Map();

  for (const row of rows) {
    const currentImages = imagesByProductId.get(row.product_id) ?? [];
    currentImages.push(row);
    imagesByProductId.set(row.product_id, currentImages);
  }

  return imagesByProductId;
}

// Revisa si el llamador pidió incluir imágenes en las options.
// Acepta el mismo formato que usábamos en Sequelize: { include: [{ model: ... }] }
function shouldIncludeImages(options = {}) {
  return Array.isArray(options.include) && options.include.length > 0;
}

// Revisa si las options piden solo la imagen de portada (is_cover: true).
function coverOnlyFromOptions(options = {}) {
  const firstInclude = options.include?.[0];
  return firstInclude?.where?.is_cover === true;
}

const Product = {
  // Crea un producto nuevo en la DB y devuelve el registro completo.
  //
  // SQL generado:
  //   INSERT INTO products (id, year, brand, ...) VALUES ($1, $2, $3, ...)
  //   RETURNING id, year, brand, ...
  //
  // RETURNING hace que PostgreSQL devuelva la fila insertada sin necesidad
  // de un SELECT extra. En Sequelize esto lo hacía automáticamente .create().
  async create(data) {
    const insertData = {
      id: uuidv4(),
      year: data.year,
      brand: data.brand,
      model: data.model,
      mileage: data.mileage,
      price: data.price,
      currency_code: data.currency_code ?? 'USD',
      drive_train: data.drive_train,
      fuel_type: data.fuel_type,
      vin_number: data.vin_number,
      description: data.description ?? null,
      publish_status: 'draft',
      sale_status: 'available',
    };
    const { columns, values, placeholders } = buildInsertParts(insertData);

    const { rows } = await query(
      `
        INSERT INTO products (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${PRODUCT_SELECT}
      `,
      values,
    );

    return hydrateProduct(rows[0]);
  },

  // Trae todos los productos. Opcionalmente incluye sus imágenes.
  //
  // Estrategia: primero trae todos los productos, luego (si se pidió)
  // carga todas las imágenes de esos productos en UNA sola query.
  // Esto evita hacer un JOIN grande o N+1 queries.
  //
  // En Sequelize: Product.findAll({ include: [{ model: ProductImage }] })
  async findAll(options = {}) {
    // Traemos productos primero y luego sus imágenes.
    // Es más simple de entender que un JOIN grande y mantiene la respuesta parecida a Sequelize.
    const { rows } = await query(`
      SELECT ${PRODUCT_SELECT}
      FROM products
    `);

    const products = rows.map((row) => {
      const product = hydrateProduct(row);
      product.images = [];
      return product;
    });

    if (!shouldIncludeImages(options)) {
      return products;
    }

    const imagesByProductId = await loadImagesByProductIds(
      products.map((product) => product.id),
      coverOnlyFromOptions(options),
    );

    for (const product of products) {
      product.images = imagesByProductId.get(product.id) ?? [];
    }

    return products;
  },

  // Busca un producto por su UUID. Opcionalmente incluye sus imágenes.
  //
  // SQL: SELECT ... FROM products WHERE id = $1 LIMIT 1
  //
  // En Sequelize: Product.findByPk(id, { include: [{ model: ProductImage }] })
  async findByPk(id, options = {}) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await query(
      `
        SELECT ${PRODUCT_SELECT}
        FROM products
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    const product = hydrateProduct(rows[0]);

    if (!product) {
      return null;
    }

    if (!shouldIncludeImages(options)) {
      return product;
    }

    product.images = await loadProductImages(id, coverOnlyFromOptions(options));
    return product;
  },

  // Actualiza solo los campos permitidos (MUTABLE_FIELDS) de un producto.
  // Si no se envía ningún campo válido, devuelve el producto sin tocarlo.
  //
  // SQL (ejemplo parcial):
  //   UPDATE products SET brand = $1, price = $2, updated_at = NOW() WHERE id = $3
  //   RETURNING ...
  //
  // Nota: startIndex en buildUpdateSetClause empieza en 1 (para $1, $2...)
  // y luego buildWhereEqualsClause continúa desde set.values.length + 1 (para $3, $4...)
  // Así los placeholders no se pisan entre sí.
  //
  // En Sequelize: product.update({ brand: 'Toyota' })
  async update(id, data) {
    const fields = MUTABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(data, field));

    if (fields.length === 0) {
      return await this.findByPk(id);
    }

    const set = buildUpdateSetClause(
      Object.fromEntries(fields.map((field) => [field, data[field]])),
      1,
    );
    const where = buildWhereEqualsClause({ id }, set.values.length + 1);

    const { rows } = await query(
      `
        UPDATE products
        SET ${set.clause}, updated_at = NOW()
        WHERE ${where.clause}
        RETURNING ${PRODUCT_SELECT}
      `,
      [...set.values, ...where.values],
    );

    return hydrateProduct(rows[0]);
  },

  // Elimina un producto por UUID y devuelve el registro eliminado.
  // Las imágenes se eliminan automáticamente por ON DELETE CASCADE en PostgreSQL.
  // (Pero ojo: Cloudinary no se limpia aquí, eso lo hace el service).
  //
  // SQL: DELETE FROM products WHERE id = $1 RETURNING ...
  //
  // En Sequelize: product.destroy()
  async deleteById(id) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await query(
      `
        DELETE FROM products
        WHERE ${where.clause}
        RETURNING ${PRODUCT_SELECT}
      `,
      where.values,
    );

    return hydrateProduct(rows[0]);
  },
};

export default Product;
