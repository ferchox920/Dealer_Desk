function serializePlatformAdmin(admin) {
  if (!admin) {
    return null;
  }

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    is_active: admin.is_active,
    last_login_at: admin.last_login_at,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
  };
}

export { serializePlatformAdmin };
