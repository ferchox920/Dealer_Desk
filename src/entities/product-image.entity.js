// ============================================================================
// product-image.entity.js
//
// Acceso SQL para la tabla "product_images". Maneja todo el CRUD de imágenes
// de productos, incluyendo operaciones especiales como:
//   - bulkCreate: INSERT masivo de varias imágenes a la vez
//   - clearCoverByProductId: quitar portada actual antes de asignar otra
//   - countByProductId: contar imágenes existentes (para calcular sort_order)
//
// Muchos métodos reciben un parámetro "executor" que por defecto es query().
// Esto permite pasarle client.query.bind(client) cuando estás dentro de una
// transacción, para que todas las operaciones corran en la misma transacción.
//
// En Sequelize sería como pasar { transaction: t } en las opciones.
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';
import {
  attachRecordMethods,
  buildInsertParts,
  buildUpdateSetClause,
  buildWhereEqualsClause,
} from './helpers.entity.js';

// Columnas que se devuelven en cada SELECT/RETURNING de imágenes.
const PRODUCT_IMAGE_SELECT = `
  id,
  product_id,
  cloudinary_public_id,
  url,
  sort_order,
  is_cover,
  created_at
`;

// Campos editables en un update de imagen.
const MUTABLE_FIELDS = [
  'product_id',
  'cloudinary_public_id',
  'url',
  'sort_order',
  'is_cover',
];

// Toma una fila cruda y le adjunta .update() y .destroy().
function hydrateImage(row) {
  if (!row) return null;

  return attachRecordMethods(row, {
    update: async (data) => ProductImage.update(row.id, data),
    destroy: async () => ProductImage.deleteById(row.id),
  });
}

// Construye un WHERE dinámico a partir de las options estilo Sequelize.
// Acepta: { where: { product_id: '...', is_cover: true } }
// Y genera: WHERE product_id = $1 AND is_cover = $2
//
// Esto mantiene la API compatible con cómo se llamaba antes desde los services.
function buildWhereClause(options = {}) {
  const filters = {};

  if (options.where?.product_id) {
    filters.product_id = options.where.product_id;
  }

  if (options.where?.is_cover !== undefined) {
    filters.is_cover = options.where.is_cover;
  }

  const where = buildWhereEqualsClause(filters);

  return {
    sql: where.clause ? `WHERE ${where.clause}` : '',
    values: where.values,
  };
}

// Construye ORDER BY de forma segura.
// Solo permite campos conocidos (sort_order, created_at) para evitar SQL injection.
// Acepta: { order: [['sort_order', 'ASC']] } (formato Sequelize)
function buildOrderClause(options = {}) {
  if (!Array.isArray(options.order) || options.order.length === 0) {
    return '';
  }

  const [field, direction = 'ASC'] = options.order[0];
  const safeField = ['sort_order', 'created_at'].includes(field) ? field : 'sort_order';
  const safeDirection = String(direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  return `ORDER BY ${safeField} ${safeDirection}`;
}

const ProductImage = {
  // Inserta UNA imagen en la DB.
  // SQL: INSERT INTO product_images (...) VALUES ($1, $2, ...) RETURNING ...
  // En Sequelize: ProductImage.create({ product_id, url, ... })
  async create(data, executor = query) {
    const insertData = {
      id: uuidv4(),
      product_id: data.product_id,
      cloudinary_public_id: data.cloudinary_public_id,
      url: data.url,
      sort_order: data.sort_order ?? 0,
      is_cover: data.is_cover ?? false,
    };
    const { columns, values, placeholders } = buildInsertParts(insertData);

    const { rows } = await executor(
      `
        INSERT INTO product_images (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${PRODUCT_IMAGE_SELECT}
      `,
      values,
    );

    return hydrateImage(rows[0]);
  },

  // INSERT MASIVO: inserta muchas imágenes en un solo query.
  // En vez de hacer 30 INSERTs separados, arma uno solo:
  //   INSERT INTO product_images (id, product_id, ...) VALUES
  //     ($1, $2, $3, $4, $5, $6),
  //     ($7, $8, $9, $10, $11, $12),
  //     ...
  //   RETURNING ...
  //
  // Cada fila tiene 6 columnas, así que los placeholders saltan de 6 en 6.
  // rowIndex * columns.length + columnIndex + 1 calcula la posición correcta.
  //
  // En Sequelize: ProductImage.bulkCreate([...], { transaction: t })
  async bulkCreate(items, executor = query) {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const columns = [
      'id',
      'product_id',
      'cloudinary_public_id',
      'url',
      'sort_order',
      'is_cover',
    ];

    const values = [];
    const valueGroups = items.map((item, rowIndex) => {
      const rowValues = [
        item.id ?? uuidv4(),
        item.product_id,
        item.cloudinary_public_id,
        item.url,
        item.sort_order ?? 0,
        item.is_cover ?? false,
      ];

      values.push(...rowValues);

      const placeholders = rowValues.map((_, columnIndex) => {
        const position = rowIndex * columns.length + columnIndex + 1;
        return `$${position}`;
      });

      return `(${placeholders.join(', ')})`;
    });

    const { rows } = await executor(
      `
        INSERT INTO product_images (${columns.join(', ')})
        VALUES ${valueGroups.join(', ')}
        RETURNING ${PRODUCT_IMAGE_SELECT}
      `,
      values,
    );

    return rows.map(hydrateImage);
  },

  // Busca imágenes con filtros opcionales y orden.
  // Acepta formato estilo Sequelize: { where: { product_id }, order: [['sort_order', 'ASC']] }
  // En Sequelize: ProductImage.findAll({ where: { product_id }, order: [...] })
  async findAll(options = {}, executor = query) {
    const whereClause = buildWhereClause(options);
    const orderClause = buildOrderClause(options);

    const { rows } = await executor(
      `
        SELECT ${PRODUCT_IMAGE_SELECT}
        FROM product_images
        ${whereClause.sql}
        ${orderClause}
      `,
      whereClause.values,
    );

    return rows.map(hydrateImage);
  },

  // Busca una imagen por su UUID.
  // SQL: SELECT ... FROM product_images WHERE id = $1 LIMIT 1
  // En Sequelize: ProductImage.findByPk(id)
  async findByPk(id, executor = query) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await executor(
      `
        SELECT ${PRODUCT_IMAGE_SELECT}
        FROM product_images
        WHERE ${where.clause}
        LIMIT 1
      `,
      where.values,
    );

    return hydrateImage(rows[0]);
  },

  // Actualiza campos editables de una imagen.
  // Solo toca los campos que estén en MUTABLE_FIELDS y que vengan en data.
  // SQL: UPDATE product_images SET sort_order = $1 WHERE id = $2 RETURNING ...
  // En Sequelize: image.update({ sort_order: 5 })
  async update(id, data, executor = query) {
    const fields = MUTABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(data, field));

    if (fields.length === 0) {
      return await this.findByPk(id);
    }

    const set = buildUpdateSetClause(
      Object.fromEntries(fields.map((field) => [field, data[field]])),
      1,
    );
    const where = buildWhereEqualsClause({ id }, set.values.length + 1);

    const { rows } = await executor(
      `
        UPDATE product_images
        SET ${set.clause}
        WHERE ${where.clause}
        RETURNING ${PRODUCT_IMAGE_SELECT}
      `,
      [...set.values, ...where.values],
    );

    return hydrateImage(rows[0]);
  },

  // Elimina una imagen por UUID y devuelve el registro eliminado.
  // SQL: DELETE FROM product_images WHERE id = $1 RETURNING ...
  // En Sequelize: image.destroy()
  async deleteById(id, executor = query) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await executor(
      `
        DELETE FROM product_images
        WHERE ${where.clause}
        RETURNING ${PRODUCT_IMAGE_SELECT}
      `,
      where.values,
    );

    return hydrateImage(rows[0]);
  },

  // Cuenta cuántas imágenes tiene un producto.
  // Se usa para calcular el sort_order de las nuevas imágenes.
  // COUNT(*)::int castea el resultado a entero (PostgreSQL devuelve bigint por defecto).
  // SQL: SELECT COUNT(*)::int AS total FROM product_images WHERE product_id = $1
  // En Sequelize: ProductImage.count({ where: { product_id } })
  async countByProductId(productId, executor = query) {
    const where = buildWhereEqualsClause({ product_id: productId });

    const { rows } = await executor(
      `
        SELECT COUNT(*)::int AS total
        FROM product_images
        WHERE ${where.clause}
      `,
      where.values,
    );

    return rows[0]?.total ?? 0;
  },

  // Quita la portada actual: pone is_cover=FALSE en TODAS las imágenes del producto.
  // Se llama antes de asignar una nueva portada.
  // SQL: UPDATE product_images SET is_cover = FALSE WHERE product_id = $1
  async clearCoverByProductId(productId, executor = query) {
    const where = buildWhereEqualsClause({ product_id: productId });

    await executor(
      `
        UPDATE product_images
        SET is_cover = FALSE
        WHERE ${where.clause}
      `,
      where.values,
    );
  },

  // Obtiene la primera imagen del producto (por sort_order y created_at).
  // Se usa para promover una nueva portada cuando se elimina la actual.
  // SQL: SELECT ... WHERE product_id = $1 ORDER BY sort_order ASC, created_at ASC LIMIT 1
  async findFirstByProductId(productId, executor = query) {
    const where = buildWhereEqualsClause({ product_id: productId });

    const { rows } = await executor(
      `
        SELECT ${PRODUCT_IMAGE_SELECT}
        FROM product_images
        WHERE ${where.clause}
        ORDER BY sort_order ASC, created_at ASC
        LIMIT 1
      `,
      where.values,
    );

    return hydrateImage(rows[0]);
  },

  // Elimina varias imágenes a la vez por sus UUIDs.
  // ANY($1::uuid[]) recibe un array de UUIDs y los matchea todos de una.
  // Es la forma de PostgreSQL de hacer "WHERE id IN ('a', 'b', 'c')" pero parametrizado.
  // SQL: DELETE FROM product_images WHERE id = ANY($1::uuid[]) RETURNING ...
  async deleteManyByIds(ids, executor = query) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return [];
    }

    const { rows } = await executor(
      `
        DELETE FROM product_images
        WHERE id = ANY($1::uuid[])
        RETURNING ${PRODUCT_IMAGE_SELECT}
      `,
      [ids],
    );

    return rows.map(hydrateImage);
  },
};

export default ProductImage;
