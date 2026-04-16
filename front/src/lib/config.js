export const APP_ROUTES = {
  login: '/',
  forgotPassword: '/forgot-password',
  passwordAction: '/password-action',
  dashboard: '/dashboard',
  inventory: '/inventory',
  inventoryNew: '/inventory/new',
  inventoryEdit: (productId = ':id') => `/inventory/${productId}/edit`,
  legacyProductsNew: '/products/new',
  users: '/users',
};

export const INVENTORY_VIEWS = {
  all: 'all',
  active: 'active',
  published: 'published',
  sold: 'sold',
  inactive: 'inactive',
  withoutImages: 'without-images',
  recent: 'recent',
};

export const API_ROUTES = {
  login: '/admin/auth/login',
  forgotPassword: '/admin/auth/forgot-password',
  passwordActionVerify: '/admin/auth/password-action/verify',
  passwordActionComplete: '/admin/auth/password-action/complete',
  refresh: '/admin/auth/refresh',
  logout: '/admin/auth/logout',
  me: '/admin/auth/me',
  products: '/admin/products',
  productById: (productId) => `/admin/products/${productId}`,
  productPublish: (productId) => `/admin/products/${productId}/publish`,
  productUnpublish: (productId) => `/admin/products/${productId}/unpublish`,
  productActivate: (productId) => `/admin/products/${productId}/activate`,
  productInactivate: (productId) => `/admin/products/${productId}/inactivate`,
  productMarkSold: (productId) => `/admin/products/${productId}/mark-sold`,
  productMarkAvailable: (productId) => `/admin/products/${productId}/mark-available`,
  productImages: (productId) => `/admin/products/${productId}/images`,
  productImagesReorder: (productId) => `/admin/products/${productId}/images/reorder`,
  productImageById: (productId, imageId) => `/admin/products/${productId}/images/${imageId}`,
  users: '/admin/users',
  userById: (userId) => `/admin/users/${userId}`,
  userResendInvite: (userId) => `/admin/users/${userId}/resend-invite`,
};

export const AUTH_STORAGE_KEYS = {
  accessToken: 'dealerDesk.accessToken',
  admin: 'dealerDesk.admin',
};

export const ADMIN_ROLES = {
  owner: 'owner',
  staff: 'staff',
};

export const IMAGE_RULES = {
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxCount: 30,
  maxSizeBytes: 5 * 1024 * 1024,
};

export const PRODUCT_CURRENCIES = {
  CLP: 'CLP',
  USD: 'USD',
};

export const PASSWORD_RULES = {
  minLength: 8,
  hint: 'Minimo 8 caracteres, con al menos 1 mayuscula, 1 numero y 1 caracter especial.',
};
