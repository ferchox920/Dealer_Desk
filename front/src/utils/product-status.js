export function buildProductDisplayName(product) {
  return [product?.year, product?.brand, product?.model].filter(Boolean).join(' ');
}

export function isProductPublished(product) {
  return product?.publish_status === 'published';
}

export function isProductActive(product) {
  return product?.publish_status === 'draft' && product?.sale_status === 'available';
}

export function isProductSold(product) {
  return product?.sale_status === 'sold';
}

export function isProductInactive(product) {
  return product?.sale_status === 'unavailable';
}

export function hasProductImages(product) {
  return Array.isArray(product?.images) && product.images.length > 0;
}

export function getProductState(product) {
  if (isProductInactive(product)) {
    return {
      key: 'inactive',
      label: 'Inactivo',
      tone: 'neutral',
    };
  }

  if (isProductSold(product)) {
    return {
      key: 'sold',
      label: 'Vendido',
      tone: 'danger',
    };
  }

  if (isProductPublished(product)) {
    return {
      key: 'published',
      label: 'Publicado',
      tone: 'success',
    };
  }

  return {
    key: 'active',
    label: 'Activo',
    tone: 'primary',
  };
}

export function getCommercialCondition(product) {
  if (isProductInactive(product)) {
    return {
      key: 'inactive',
      label: 'Inactivo',
      tone: 'neutral',
    };
  }

  if (isProductSold(product)) {
    return {
      key: 'sold',
      label: 'Vendido',
      tone: 'danger',
    };
  }

  return {
    key: 'available',
    label: 'Disponible',
    tone: 'primary',
  };
}

export function getWebsiteVisibilityLabel(product) {
  return isProductPublished(product) ? 'Publicado en web' : 'Solo en sistema';
}

export function canPublishProduct(product) {
  return Boolean(product) && product.sale_status !== 'unavailable' && product.publish_status !== 'published';
}

export function canUnpublishProduct(product) {
  return Boolean(product) && product.publish_status === 'published';
}

export function canActivateProduct(product) {
  return Boolean(product) && product.sale_status === 'unavailable';
}

export function canInactivateProduct(product) {
  return Boolean(product) && product.sale_status !== 'unavailable';
}

export function canMarkSoldProduct(product) {
  return Boolean(product) && product.sale_status === 'available';
}

export function canMarkAvailableProduct(product) {
  return Boolean(product) && product.sale_status === 'sold';
}

export function canDeleteProduct(product) {
  return Boolean(product) && product.sale_status === 'unavailable';
}
