const OWNER_ROLE = 'owner';
const STAFF_ROLE = 'staff';

const ADMIN_ROLES = [
  OWNER_ROLE,
  STAFF_ROLE,
];

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

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
