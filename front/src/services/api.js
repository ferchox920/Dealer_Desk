const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(status, data, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = data?.code || data?.errors?.[0]?.code || 'API_ERROR';
  }
}

function resolveErrorMessage(data, fallbackMessage = 'Request failed.') {
  if (data?.error) {
    return data.error;
  }

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors[0].message || fallbackMessage;
  }

  if (typeof data === 'string') {
    const trimmed = data.trim();

    if (trimmed.length > 0 && !trimmed.startsWith('<')) {
      return trimmed;
    }
  }

  return fallbackMessage;
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return await response.json().catch(() => null);
  }

  return await response.text().catch(() => null);
}

export async function apiRequest(path, options = {}) {
  // Este cliente HTTP concentra lo repetitivo:
  // - prefijo base /api
  // - token Bearer cuando hace falta
  // - JSON vs FormData
  // - errores uniformes para que las paginas trabajen con la misma forma
  const {
    body,
    credentials = 'omit',
    headers = {},
    method = 'GET',
    token,
  } = options;

  const requestHeaders = new Headers(headers);
  const isFormData = body instanceof FormData;

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  if (body !== undefined && body !== null && !isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  let response;

  try {
    // Con Vite en desarrollo, /api viaja por proxy a localhost:3000.
    // Asi el front no hardcodea URLs del backend en cada servicio.
    response = await fetch(`${API_BASE_URL}${path}`, {
      body:
        body === undefined || body === null
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
      credentials,
      headers: requestHeaders,
      method,
    });
  } catch (_error) {
    throw new ApiError(0, null, 'No pudimos conectar con la API.');
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    // Lanzamos un error rico en datos para poder mostrar mensajes utiles
    // y, cuando existan, errores por campo del backend.
    throw new ApiError(response.status, data, resolveErrorMessage(data, response.statusText));
  }

  return data;
}
