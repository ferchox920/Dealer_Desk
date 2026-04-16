const SUPER_ADMIN_ROLE = 'super_admin';

const PLATFORM_ADMIN_ROLES = [
  SUPER_ADMIN_ROLE,
];

function getPlatformAdminRolesSqlList() {
  return PLATFORM_ADMIN_ROLES.map((role) => `'${role}'`).join(', ');
}

export {
  PLATFORM_ADMIN_ROLES,
  SUPER_ADMIN_ROLE,
  getPlatformAdminRolesSqlList,
};
