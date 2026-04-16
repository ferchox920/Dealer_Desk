import { API_ROUTES } from '@/lib/config';
import { apiRequest } from '@/services/api';

export async function uploadProductImagesRequest(productId, files, accessToken) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await apiRequest(API_ROUTES.productImages(productId), {
    body: formData,
    method: 'POST',
    token: accessToken,
  });

  return response.data;
}

export async function listProductImagesRequest(productId, accessToken) {
  const response = await apiRequest(API_ROUTES.productImages(productId), {
    method: 'GET',
    token: accessToken,
  });

  return response.data;
}

export async function reorderProductImagesRequest(productId, orderedImageIds, accessToken) {
  const response = await apiRequest(API_ROUTES.productImagesReorder(productId), {
    body: { orderedImageIds },
    method: 'PUT',
    token: accessToken,
  });

  return response.data;
}

export async function updateProductImageRequest(productId, imageId, imageData, accessToken) {
  const response = await apiRequest(API_ROUTES.productImageById(productId, imageId), {
    body: imageData,
    method: 'PUT',
    token: accessToken,
  });

  return response.data;
}

export async function deleteProductImageRequest(productId, imageId, accessToken) {
  const response = await apiRequest(API_ROUTES.productImageById(productId, imageId), {
    method: 'DELETE',
    token: accessToken,
  });

  return response.data;
}
