function serializeAdmin(admin) {
  if (!admin) {
    return null;
  }

  const hasPassword = typeof admin.password_hash === 'string' && admin.password_hash.length > 0;

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    is_active: admin.is_active,
    has_password: hasPassword,
    password_status: hasPassword ? 'ready' : 'pending',
    last_login_at: admin.last_login_at,
    created_by_admin_id: admin.created_by_admin_id,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
  };
}

export { serializeAdmin };
