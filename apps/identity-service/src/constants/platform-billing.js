function normalizeCode(code) {
  return String(code || '').trim().toLowerCase();
}

export const INACTIVE_PROPERTIES_LIMIT = 25;
export const INACTIVE_USERS_LIMIT = 5;

export const PLATFORM_PLAN_DEFINITIONS = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'Hasta 25 propiedades activas y 5 usuarios activos para operar con claridad desde el inicio.',
    highlight: 'Ideal para equipos que quieren ordenar su operacion sin complicarse.',
    active_properties_limit: 25,
    active_users_limit: 5,
    price: {
      currency_code: 'UF',
      amount: 0.75,
      billing_period: 'monthly',
    },
  },
  {
    code: 'growth',
    name: 'Growth',
    description: 'Hasta 100 propiedades activas y 10 usuarios activos para equipos con mas movimiento.',
    highlight: 'Pensado para operaciones que necesitan mas capacidad sin perder simplicidad.',
    active_properties_limit: 100,
    active_users_limit: 10,
    price: {
      currency_code: 'UF',
      amount: 1.35,
      billing_period: 'monthly',
    },
  },
];

export const PLATFORM_ADDON_DEFINITIONS = [
  {
    code: 'pub-25',
    name: '+25 propiedades activas',
    description: 'Suma 25 propiedades activas a la capacidad de tu plan actual.',
    addon_type: 'publication_pack',
    capacity_type: 'active_properties',
    quantity: 25,
    price: {
      currency_code: 'UF',
      amount: 0.18,
      billing_period: 'monthly',
    },
  },
  {
    code: 'pub-100',
    name: '+100 propiedades activas',
    description: 'Suma 100 propiedades activas a la capacidad de tu plan actual.',
    addon_type: 'publication_pack',
    capacity_type: 'active_properties',
    quantity: 100,
    price: {
      currency_code: 'UF',
      amount: 0.55,
      billing_period: 'monthly',
    },
  },
  {
    code: 'user-1',
    name: '+1 usuario activo',
    description: 'Suma 1 usuario activo a la capacidad de tu plan actual.',
    addon_type: 'user_pack',
    capacity_type: 'active_users',
    quantity: 1,
    price: {
      currency_code: 'UF',
      amount: 0.05,
      billing_period: 'monthly',
    },
  },
  {
    code: 'user-10',
    name: '+10 usuarios activos',
    description: 'Suma 10 usuarios activos a la capacidad de tu plan actual.',
    addon_type: 'user_pack',
    capacity_type: 'active_users',
    quantity: 10,
    price: {
      currency_code: 'UF',
      amount: 0.32,
      billing_period: 'monthly',
    },
  },
];

export function getPlanDefinition(planCode) {
  const normalizedPlanCode = normalizeCode(planCode);
  return PLATFORM_PLAN_DEFINITIONS.find((plan) => plan.code === normalizedPlanCode) ?? null;
}

export function getAddonDefinition(addonCode) {
  const normalizedAddonCode = normalizeCode(addonCode);
  return PLATFORM_ADDON_DEFINITIONS.find((addon) => addon.code === normalizedAddonCode) ?? null;
}

export function getCapacityTypeFromAddonType(addonType) {
  if (addonType === 'publication_pack') {
    return 'active_properties';
  }

  if (addonType === 'user_pack') {
    return 'active_users';
  }

  return 'unknown';
}
