import { API_ROUTES } from '@/lib/config';
import { apiRequest } from '@/services/api';

export async function loginRequest(credentials) {
  const response = await apiRequest(API_ROUTES.login, {
    body: credentials,
    credentials: 'include',
    method: 'POST',
  });

  return response.data;
}

export async function forgotPasswordRequest(payload) {
  const response = await apiRequest(API_ROUTES.forgotPassword, {
    body: payload,
    method: 'POST',
  });

  return response.data;
}

export async function verifyPasswordActionRequest(payload) {
  const response = await apiRequest(API_ROUTES.passwordActionVerify, {
    body: payload,
    method: 'POST',
  });

  return response.data;
}

export async function completePasswordActionRequest(payload) {
  const response = await apiRequest(API_ROUTES.passwordActionComplete, {
    body: payload,
    method: 'POST',
  });

  return response.data;
}

export async function refreshRequest() {
  const response = await apiRequest(API_ROUTES.refresh, {
    credentials: 'include',
    method: 'POST',
  });

  return response.data;
}

export async function logoutRequest() {
  const response = await apiRequest(API_ROUTES.logout, {
    credentials: 'include',
    method: 'POST',
  });

  return response.data;
}

export async function getCurrentAdminRequest(accessToken) {
  const response = await apiRequest(API_ROUTES.me, {
    method: 'GET',
    token: accessToken,
  });

  return response.data;
}
