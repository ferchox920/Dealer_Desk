import { AUTH_STORAGE_KEYS } from '@/lib/config';

export function readStoredAccessToken() {
  return window.sessionStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
}

export function readStoredAdmin() {
  const rawValue = window.sessionStorage.getItem(AUTH_STORAGE_KEYS.admin);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEYS.admin);
    return null;
  }
}

export function persistSession({ accessToken, admin }) {
  if (accessToken) {
    window.sessionStorage.setItem(AUTH_STORAGE_KEYS.accessToken, accessToken);
  }

  if (admin) {
    window.sessionStorage.setItem(AUTH_STORAGE_KEYS.admin, JSON.stringify(admin));
  }
}

export function clearPersistedSession() {
  window.sessionStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEYS.admin);
}
