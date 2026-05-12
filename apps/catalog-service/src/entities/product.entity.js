import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';
import {
  attachRecordMethods,
  buildInsertParts,
  buildPlaceholder,
  buildUpdateSetClause,
  buildWhereEqualsClause,
} from './helpers.entity.js';

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
  drive_train_i18n,
  fuel_type,
  fuel_type_i18n,
  vin_number,
  description,
  description_i18n,
  publish_status,
  sale_status,
  is_featured,
  featured_at,
  created_at,
  updated_at
`;

const MUTABLE_FIELDS = [
  'year',
  'brand',
  'model',
  'mileage',
  'price',
  'currency_code',
  'drive_train',
  'drive_train_i18n',
  'fuel_type',
  'fuel_type_i18n',
  'vin_number',
  'description',
  'description_i18n',
  'publish_status',
  'sale_status',
  'is_featured',
  'featured_at',
];

function hydrateProduct(row) {
  if (!row) return null;

  return attachRecordMethods(row, {
    update: async (data) => Product.update(row.id, data),
    destroy: async () => Product.deleteById(row.id),
  });
}

async function loadProductImages(productId, coverOnly = false, executor = query) {
  const where = buildWhereEqualsClause({ product_id: productId });
  const coverFilter = coverOnly ? 'AND is_cover = TRUE' : '';
  const orderClause = coverOnly ? '' : 'ORDER BY sort_order ASC';

  const { rows } = await executor(
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

async function loadImagesByProductIds(productIds, coverOnly = false, executor = query) {
  if (productIds.length === 0) {
    return new Map();
  }

  const coverFilter = coverOnly ? 'AND is_cover = TRUE' : '';
  const orderClause = coverOnly ? '' : 'ORDER BY product_id ASC, sort_order ASC';

  const { rows } = await executor(
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

async function loadImageCountsByProductIds(productIds, executor = query) {
  if (productIds.length === 0) {
    return new Map();
  }

  const { rows } = await executor(
    `
      SELECT
        product_id,
        COUNT(*)::integer AS image_count
      FROM product_images
      WHERE product_id = ANY(${buildPlaceholder(1)}::uuid[])
      GROUP BY product_id
    `,
    [productIds],
  );

  return new Map(rows.map((row) => [row.product_id, row.image_count]));
}

async function attachImageCounts(products, executor = query) {
  const imageCountsByProductId = await loadImageCountsByProductIds(
    products.map((product) => product.id),
    executor,
  );

  for (const product of products) {
    product.image_count = imageCountsByProductId.get(product.id) ?? 0;
  }

  return products;
}

function shouldIncludeImages(options = {}) {
  return Array.isArray(options.include) && options.include.length > 0;
}

function coverOnlyFromOptions(options = {}) {
  const firstInclude = options.include?.[0];
  return firstInclude?.where?.is_cover === true;
}

function buildPublicVisibilityClause() {
  return `
    publish_status = 'published'
    AND sale_status <> 'unavailable'
  `;
}

function buildPublicFilters(options = {}) {
  const clauses = [buildPublicVisibilityClause()];
  const values = [];

  if (typeof options.brand === 'string' && options.brand.trim().length > 0) {
    values.push(options.brand.trim().toLowerCase());
    clauses.push(`LOWER(brand) = ${buildPlaceholder(values.length)}`);
  }

  if (typeof options.model === 'string' && options.model.trim().length > 0) {
    values.push(`%${options.model.trim().toLowerCase()}%`);
    clauses.push(`LOWER(model) LIKE ${buildPlaceholder(values.length)}`);
  }

  if (typeof options.currency_code === 'string' && options.currency_code.trim().length > 0) {
    values.push(options.currency_code.trim().toUpperCase());
    clauses.push(`currency_code = ${buildPlaceholder(values.length)}`);
  }

  if (typeof options.year_from === 'number') {
    values.push(options.year_from);
    clauses.push(`year >= ${buildPlaceholder(values.length)}`);
  }

  if (typeof options.year_to === 'number') {
    values.push(options.year_to);
    clauses.push(`year <= ${buildPlaceholder(values.length)}`);
  }

  if (typeof options.price_min === 'number') {
    values.push(options.price_min);
    clauses.push(`price >= ${buildPlaceholder(values.length)}`);
  }

  if (typeof options.price_max === 'number') {
    values.push(options.price_max);
    clauses.push(`price <= ${buildPlaceholder(values.length)}`);
  }

  const limit = typeof options.limit === 'number' ? options.limit : 24;
  const page = typeof options.page === 'number' ? options.page : 1;
  const offset = (page - 1) * limit;
  const sortBy = options.sort_by === 'price'
    ? 'price'
    : options.sort_by === 'year'
      ? 'year'
      : 'created_at';
  const sortDirection = options.sort_direction === 'asc' ? 'ASC' : 'DESC';

  values.push(limit);
  const limitPlaceholder = buildPlaceholder(values.length);
  values.push(offset);
  const offsetPlaceholder = buildPlaceholder(values.length);

  return {
    clause: clauses.join(' AND '),
    limitPlaceholder,
    offsetPlaceholder,
    orderClause: `ORDER BY ${sortBy} ${sortDirection}, created_at DESC`,
    values,
  };
}

function buildPublicExcludeIdsClause(excludeIds = [], startIndex = 1) {
  const normalizedIds = Array.isArray(excludeIds)
    ? excludeIds.filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];

  if (normalizedIds.length === 0) {
    return {
      clause: '',
      values: [],
    };
  }

  return {
    clause: `AND id <> ALL(${buildPlaceholder(startIndex)}::uuid[])`,
    values: [normalizedIds],
  };
}

async function attachIncludedImages(products, options = {}, executor = query) {
  if (!shouldIncludeImages(options) || products.length === 0) {
    return products;
  }

  const imagesByProductId = await loadImagesByProductIds(
    products.map((product) => product.id),
    coverOnlyFromOptions(options),
    executor,
  );

  for (const product of products) {
    product.images = imagesByProductId.get(product.id) ?? [];
  }

  return products;
}

async function buildPublicCollection(rows, options = {}, executor = query) {
  const products = rows.map((row) => {
    const product = hydrateProduct(row);
    product.images = [];
    return product;
  });

  await attachImageCounts(products, executor);
  return await attachIncludedImages(products, options, executor);
}

const Product = {
  async create(data, executor = query) {
    const insertData = {
      id: uuidv4(),
      year: data.year,
      brand: data.brand,
      model: data.model,
      mileage: data.mileage,
      price: data.price,
      currency_code: data.currency_code ?? 'USD',
      drive_train: data.drive_train,
      drive_train_i18n: data.drive_train_i18n,
      fuel_type: data.fuel_type,
      fuel_type_i18n: data.fuel_type_i18n,
      vin_number: data.vin_number,
      description: data.description ?? null,
      description_i18n: data.description_i18n,
      publish_status: 'draft',
      sale_status: 'available',
      is_featured: false,
      featured_at: null,
    };
    const { columns, values, placeholders } = buildInsertParts(insertData);

    const { rows } = await executor(
      `
        INSERT INTO products (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${PRODUCT_SELECT}
      `,
      values,
    );

    return hydrateProduct(rows[0]);
  },

  async findAll(options = {}, executor = query) {
    const { rows } = await executor(`
      SELECT ${PRODUCT_SELECT}
      FROM products
    `);

    const products = rows.map((row) => {
      const product = hydrateProduct(row);
      product.images = [];
      return product;
    });

    await attachImageCounts(products, executor);

    if (!shouldIncludeImages(options)) {
      return products;
    }

    const imagesByProductId = await loadImagesByProductIds(
      products.map((product) => product.id),
      coverOnlyFromOptions(options),
      executor,
    );

    for (const product of products) {
      product.images = imagesByProductId.get(product.id) ?? [];
    }

    return products;
  },

  async findByPk(id, options = {}, executor = query) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await executor(
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

    product.image_count = (await loadImageCountsByProductIds([id], executor)).get(id) ?? 0;

    if (!shouldIncludeImages(options)) {
      return product;
    }

    product.images = await loadProductImages(id, coverOnlyFromOptions(options), executor);
    return product;
  },

  async findPublicCatalog(options = {}, executor = query) {
    const filters = buildPublicFilters(options);
    const { rows: countRows } = await executor(
      `
        SELECT COUNT(*)::int AS total
        FROM products
        WHERE ${filters.clause}
      `,
      filters.values.slice(0, -2),
    );

    const { rows } = await executor(
      `
        SELECT ${PRODUCT_SELECT}
        FROM products
        WHERE ${filters.clause}
        ${filters.orderClause}
        LIMIT ${filters.limitPlaceholder}
        OFFSET ${filters.offsetPlaceholder}
      `,
      filters.values,
    );

    const products = await buildPublicCollection(rows, options, executor);

    return {
      items: products,
      total: countRows[0]?.total ?? 0,
    };
  },

  async findPublicByPk(id, options = {}, executor = query) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await executor(
      `
        SELECT ${PRODUCT_SELECT}
        FROM products
        WHERE ${where.clause}
          AND ${buildPublicVisibilityClause()}
        LIMIT 1
      `,
      where.values,
    );

    const product = hydrateProduct(rows[0]);

    if (!product) {
      return null;
    }

    product.image_count = (await loadImageCountsByProductIds([id], executor)).get(id) ?? 0;

    if (!shouldIncludeImages(options)) {
      return product;
    }

    product.images = await loadProductImages(id, coverOnlyFromOptions(options), executor);
    return product;
  },

  async findPublicBrands(executor = query) {
    const { rows } = await executor(
      `
        SELECT brand, COUNT(*)::int AS total
        FROM products
        WHERE ${buildPublicVisibilityClause()}
        GROUP BY brand
        ORDER BY brand ASC
      `,
    );

    return rows;
  },

  async findPublicModelsByBrand(brand, executor = query) {
    const values = [];
    const clauses = [buildPublicVisibilityClause()];

    if (typeof brand === 'string' && brand.trim().length > 0) {
      values.push(brand.trim().toLowerCase());
      clauses.push(`LOWER(brand) = ${buildPlaceholder(values.length)}`);
    }

    const { rows } = await executor(
      `
        SELECT model, COUNT(*)::int AS total
        FROM products
        WHERE ${clauses.join(' AND ')}
        GROUP BY model
        ORDER BY model ASC
      `,
      values,
    );

    return rows;
  },

  async findPublicFeatured(options = {}, executor = query) {
    const limit = typeof options.limit === 'number' ? options.limit : 6;

    const { rows } = await executor(
      `
        SELECT ${PRODUCT_SELECT}
        FROM products
        WHERE is_featured = TRUE
          AND ${buildPublicVisibilityClause()}
        ORDER BY featured_at DESC NULLS LAST, created_at DESC
        LIMIT ${buildPlaceholder(1)}
      `,
      [limit],
    );

    return await buildPublicCollection(rows, options, executor);
  },

  async findPublicRecent(options = {}, executor = query) {
    const limit = typeof options.limit === 'number' ? options.limit : 6;
    const excludeIds = buildPublicExcludeIdsClause(options.excludeIds, 2);
    const values = [limit, ...excludeIds.values];

    const { rows } = await executor(
      `
        SELECT ${PRODUCT_SELECT}
        FROM products
        WHERE ${buildPublicVisibilityClause()}
        ${excludeIds.clause}
        ORDER BY created_at DESC
        LIMIT ${buildPlaceholder(1)}
      `,
      values,
    );

    return await buildPublicCollection(rows, options, executor);
  },

  async findPublicSimilar(options = {}, executor = query) {
    const limit = typeof options.limit === 'number' ? options.limit : 4;
    const values = [
      options.productId,
      options.brand?.trim().toLowerCase() ?? '',
      options.model?.trim().toLowerCase() ?? '',
      options.year ?? 0,
      limit,
    ];

    const { rows } = await executor(
      `
        SELECT ${PRODUCT_SELECT}
        FROM products
        WHERE ${buildPublicVisibilityClause()}
          AND id <> ${buildPlaceholder(1)}
          AND LOWER(brand) = ${buildPlaceholder(2)}
        ORDER BY
          CASE
            WHEN LOWER(model) = ${buildPlaceholder(3)} THEN 0
            ELSE 1
          END ASC,
          ABS(year - ${buildPlaceholder(4)}) ASC,
          created_at DESC
        LIMIT ${buildPlaceholder(5)}
      `,
      values,
    );

    const primaryMatches = await buildPublicCollection(rows, options, executor);

    if (primaryMatches.length >= limit) {
      return primaryMatches;
    }

    const fallbackMatches = await this.findPublicRecent({
      ...options,
      limit: limit - primaryMatches.length,
      excludeIds: [
        options.productId,
        ...primaryMatches.map((product) => product.id),
      ],
    }, executor);

    return [...primaryMatches, ...fallbackMatches];
  },

  async countFeatured(executor = query) {
    const { rows } = await executor(
      `
        SELECT COUNT(*)::integer AS count
        FROM products
        WHERE is_featured = TRUE
      `,
    );

    return rows[0]?.count ?? 0;
  },

  async countActiveForPlan(executor = query) {
    const { rows } = await executor(
      `
        SELECT COUNT(*)::integer AS count
        FROM products
        WHERE sale_status <> 'unavailable'
      `,
    );

    return rows[0]?.count ?? 0;
  },

  async countInactiveForPlan(executor = query) {
    const { rows } = await executor(
      `
        SELECT COUNT(*)::integer AS count
        FROM products
        WHERE sale_status = 'unavailable'
      `,
    );

    return rows[0]?.count ?? 0;
  },

  async update(id, data, executor = query) {
    const fields = MUTABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(data, field));

    if (fields.length === 0) {
      return await this.findByPk(id, {}, executor);
    }

    const set = buildUpdateSetClause(
      Object.fromEntries(fields.map((field) => [field, data[field]])),
      1,
    );
    const where = buildWhereEqualsClause({ id }, set.values.length + 1);

    const { rows } = await executor(
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

  async deleteById(id, executor = query) {
    const where = buildWhereEqualsClause({ id });

    const { rows } = await executor(
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
