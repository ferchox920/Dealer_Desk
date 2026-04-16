import { API_ROUTES } from '@/lib/config';
import { apiRequest } from '@/services/api';

export async function listUsersRequest(accessToken) {
  const response = await apiRequest(API_ROUTES.users, {
    method: 'GET',
    token: accessToken,
  });

  return response.data;
}

export async function createUserRequest(userData, accessToken) {
  const response = await apiRequest(API_ROUTES.users, {
    body: userData,
    method: 'POST',
    token: accessToken,
  });

  return response.data;
}

export async function updateUserRequest(userId, userData, accessToken) {
  const response = await apiRequest(API_ROUTES.userById(userId), {
    body: userData,
    method: 'PATCH',
    token: accessToken,
  });

  return response.data;
}

export async function deleteUserRequest(userId, accessToken) {
  const response = await apiRequest(API_ROUTES.userById(userId), {
    method: 'DELETE',
    token: accessToken,
  });

  return response.data;
}

export async function resendUserInviteRequest(userId, accessToken) {
  const response = await apiRequest(API_ROUTES.userResendInvite(userId), {
    method: 'POST',
    token: accessToken,
  });

  return response.data;
}
