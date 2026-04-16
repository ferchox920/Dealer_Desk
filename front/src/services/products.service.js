import { API_ROUTES } from '@/lib/config';
import { apiRequest } from '@/services/api';

// Productos es hoy el corazon operativo del panel.
// Este archivo deja juntas las llamadas del modulo para que las paginas
// no conozcan detalles de fetch ni URLs del backend.
export async function createProductRequest(productData, accessToken) {
  const response = await apiRequest(API_ROUTES.products, {
    body: productData,
    method: 'POST',
    token: accessToken,
  });

  return response.data;
}

export async function listProductsRequest(accessToken) {
  const response = await apiRequest(API_ROUTES.products, {
    method: 'GET',
    token: accessToken,
  });

  return response.data;
}

export async function getProductRequest(productId, accessToken) {
  const response = await apiRequest(API_ROUTES.productById(productId), {
    method: 'GET',
    token: accessToken,
  });

  return response.data;
}

export async function updateProductRequest(productId, productData, accessToken) {
  const response = await apiRequest(API_ROUTES.productById(productId), {
    body: productData,
    method: 'PUT',
    token: accessToken,
  });

  return response.data;
}

export async function publishProductRequest(productId, accessToken) {
  const response = await apiRequest(API_ROUTES.productPublish(productId), {
    method: 'POST',
    token: accessToken,
  });

  return response.data;
}

export async function unpublishProductRequest(productId, accessToken) {
  const response = await apiRequest(API_ROUTES.productUnpublish(productId), {
    method: 'POST',
    token: accessToken,
  });

  return response.data;
}

export async function activateProductRequest(productId, accessToken) {
  const response = await apiRequest(API_ROUTES.productActivate(productId), {
    method: 'POST',
    token: accessToken,
  });

  return response.data;
}

export async function inactivateProductRequest(productId, accessToken) {
  const response = await apiRequest(API_ROUTES.productInactivate(productId), {
    method: 'POST',
    token: accessToken,
  });

  return response.data;
}

export async function markProductSoldRequest(productId, accessToken) {
  const response = await apiRequest(API_ROUTES.productMarkSold(productId), {
    method: 'POST',
    token: accessToken,
  });

  return response.data;
}

export async function markProductAvailableRequest(productId, accessToken) {
  const response = await apiRequest(API_ROUTES.productMarkAvailable(productId), {
    method: 'POST',
    token: accessToken,
  });

  return response.data;
}

export async function deleteProductRequest(productId, accessToken) {
  const response = await apiRequest(API_ROUTES.productById(productId), {
    method: 'DELETE',
    token: accessToken,
  });

  return response.data;
}
