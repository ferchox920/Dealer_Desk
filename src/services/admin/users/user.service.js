// ============================================================================
// user.service.js
//
// Gestión de usuarios del panel usando la tabla admins.
// Decisión actual: no separar otra tabla "users" todavía.
// owner/staff viven aquí y son creados/gestionados desde el panel admin.
// ============================================================================

import Admin from '../../../entities/admin.entity.js';
import { OWNER_ROLE, STAFF_ROLE } from '../../../constants/admin-roles.js';
import { createHttpError } from '../../../utils/errors/app-error.util.js';
import { trimBoundaryWhitespace } from '../../../utils/normalizers/string-normalizer.util.js';
import { hashPassword } from '../../../utils/security/password.util.js';

function normalizeEmail(email) {
  return trimBoundaryWhitespace(email).toLowerCase();
}

function normalizeName(name) {
  const trimmedName = trimBoundaryWhitespace(name);

  if (typeof trimmedName !== 'string' || trimmedName.length === 0) {
    return null;
  }

  return trimmedName;
}

function normalizePassword(password) {
  return trimBoundaryWhitespace(password);
}

function serializeAdmin(admin) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    is_active: admin.is_active,
    last_login_at: admin.last_login_at,
    created_by_admin_id: admin.created_by_admin_id,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
  };
}

async function ensureEmailAvailable(email, currentId = null) {
  const existingAdmin = await Admin.findOneByEmail(email);

  if (existingAdmin && existingAdmin.id !== currentId) {
    throw createHttpError(409, 'Email already in use.', 'ADMIN_EMAIL_ALREADY_IN_USE');
  }
}

async function ensureOwnerSafety(targetAdmin, updates = {}, actorId = null) {
  // Este guardrail evita dejar el sistema sin ningún owner activo.
  // Es una regla pequeña, pero protege mucho: sin ella, podrías bloquear
  // la administración del sistema por accidente.
  const willDisableOwner = targetAdmin.role === OWNER_ROLE && updates.is_active === false;
  const willDemoteOwner = targetAdmin.role === OWNER_ROLE && updates.role === STAFF_ROLE;

  if (!willDisableOwner && !willDemoteOwner) {
    return;
  }

  if (actorId && actorId === targetAdmin.id) {
    throw createHttpError(400, 'You cannot remove your own owner access.', 'OWNER_SELF_LOCKOUT');
  }

  const remainingOwners = await Admin.countActiveOwners({ excludeId: targetAdmin.id });

  if (remainingOwners < 1) {
    throw createHttpError(400, 'At least one active owner must remain.', 'OWNER_REQUIRED');
  }
}

class UserService {
  async list(filters = {}) {
    const admins = await Admin.findAll(filters);
    return admins.map(serializeAdmin);
  }

  async getById(id) {
    const admin = await Admin.findByPk(id);

    if (!admin) {
      throw createHttpError(404, 'Admin not found.', 'ADMIN_NOT_FOUND');
    }

    return serializeAdmin(admin);
  }

  async create(data, actor = null) {
    const normalizedEmail = normalizeEmail(data.email);
    await ensureEmailAvailable(normalizedEmail);

    // Aquí seguimos creando registros en admins porque HOY esa tabla representa
    // los usuarios del panel. Si mañana cambias naming o arquitectura,
    // este service te da un punto central para hacer la migración.
    const admin = await Admin.create({
      name: normalizeName(data.name),
      email: normalizedEmail,
      password_hash: await hashPassword(normalizePassword(data.password)),
      role: data.role,
      is_active: data.is_active ?? true,
      created_by_admin_id: actor?.id ?? null,
    });

    return serializeAdmin(admin);
  }

  async update(id, data, actor = null) {
    const admin = await Admin.findByPk(id);

    if (!admin) {
      throw createHttpError(404, 'Admin not found.', 'ADMIN_NOT_FOUND');
    }

    const updateData = {};

    if (data.name !== undefined) {
      updateData.name = normalizeName(data.name);
    }

    if (data.email !== undefined) {
      updateData.email = normalizeEmail(data.email);
      await ensureEmailAvailable(updateData.email, admin.id);
    }

    if (data.password !== undefined) {
      updateData.password_hash = await hashPassword(normalizePassword(data.password));
    }

    if (data.role !== undefined) {
      updateData.role = data.role;
    }

    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    await ensureOwnerSafety(admin, updateData, actor?.id ?? null);

    const updatedAdmin = await admin.update(updateData);
    return serializeAdmin(updatedAdmin);
  }

  async delete(id, actor = null) {
    const admin = await Admin.findByPk(id);

    if (!admin) {
      throw createHttpError(404, 'Admin not found.', 'ADMIN_NOT_FOUND');
    }

    if (actor?.id === admin.id) {
      throw createHttpError(400, 'You cannot delete your own account.', 'SELF_DELETE_NOT_ALLOWED');
    }

    if (admin.role === OWNER_ROLE && admin.is_active) {
      const remainingOwners = await Admin.countActiveOwners({ excludeId: admin.id });

      if (remainingOwners < 1) {
        throw createHttpError(400, 'At least one active owner must remain.', 'OWNER_REQUIRED');
      }
    }

    const deletedAdmin = await Admin.deleteById(id);
    return serializeAdmin(deletedAdmin);
  }
}

export default new UserService();
