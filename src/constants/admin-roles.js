// ============================================================================
// admin-roles.js
//
// Centralizamos los roles del panel en un solo lugar para que el día de mañana
// agregar "manager" no implique salir a buscar strings sueltos por todo el
// proyecto. La idea es que el cambio fuerte ocurra aquí primero.
// ============================================================================

const OWNER_ROLE = 'owner';
const STAFF_ROLE = 'staff';

const ADMIN_ROLES = [
  OWNER_ROLE,
  STAFF_ROLE,
];

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

// Convierte ['owner', 'staff'] en "'owner', 'staff'" para reutilizarlo
// al construir la constraint SQL de PostgreSQL.
function getAdminRolesSqlList() {
  return ADMIN_ROLES.map((role) => `'${role}'`).join(', ');
}

export {
  ADMIN_ROLES,
  OWNER_ROLE,
  STAFF_ROLE,
  getAdminRolesSqlList,
  isAdminRole,
};
