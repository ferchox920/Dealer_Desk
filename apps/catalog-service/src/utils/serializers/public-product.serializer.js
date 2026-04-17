function buildPublicProductTitle(product) {
  return [product.brand, product.model, product.year]
    .filter(Boolean)
    .join(' ');
}

function formatPublicPrice(product) {
  if (typeof product.price !== 'number') {
    return null;
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: product.currency_code || 'USD',
      maximumFractionDigits: 0,
    }).format(product.price);
  } catch (_error) {
    return `${product.currency_code || 'USD'} ${product.price}`;
  }
}

function buildCoverImage(product) {
  const coverImage = Array.isArray(product.images) ? product.images[0] : null;

  if (!coverImage) {
    return null;
  }

  return {
    id: coverImage.id,
    url: coverImage.url,
    alt: buildPublicProductTitle(product),
  };
}

function serializePublicCatalogCard(product) {
  return {
    id: product.id,
    internal_code: product.internal_code,
    slug: product.id,
    title: buildPublicProductTitle(product),
    brand: product.brand,
    model: product.model,
    year: product.year,
    mileage: product.mileage,
    price: {
      amount: product.price,
      currency_code: product.currency_code,
      display: formatPublicPrice(product),
    },
    summary: {
      drive_train: product.drive_train,
      fuel_type: product.fuel_type,
    },
    cover_image: buildCoverImage(product),
    publish_status: product.publish_status,
    sale_status: product.sale_status,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

function serializePublicCatalogDetail(product) {
  return {
    id: product.id,
    internal_code: product.internal_code,
    slug: product.id,
    title: buildPublicProductTitle(product),
    brand: product.brand,
    model: product.model,
    year: product.year,
    mileage: product.mileage,
    price: {
      amount: product.price,
      currency_code: product.currency_code,
      display: formatPublicPrice(product),
    },
    specs: {
      drive_train: product.drive_train,
      fuel_type: product.fuel_type,
      vin_number: product.vin_number,
    },
    description: product.description,
    cover_image: buildCoverImage(product),
    gallery: Array.isArray(product.images)
      ? product.images.map((image) => ({
        id: image.id,
        url: image.url,
        is_cover: image.is_cover,
        sort_order: image.sort_order,
      }))
      : [],
    publish_status: product.publish_status,
    sale_status: product.sale_status,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

export {
  serializePublicCatalogCard,
  serializePublicCatalogDetail,
};
