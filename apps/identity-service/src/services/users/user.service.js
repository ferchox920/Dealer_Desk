import db from '../../config/db/db.js';
import Admin from '../../entities/admin.entity.js';
import { OWNER_ROLE, STAFF_ROLE } from '../../constants/admin-roles.js';
import passwordActionService from '../auth/password-action.service.js';
import { createHttpError } from '../../utils/errors/app-error.util.js';
import { trimBoundaryWhitespace } from '../../utils/normalizers/string-normalizer.util.js';
import { serializeAdmin } from '../../utils/serializers/admin.serializer.js';
import {
  getPasswordPolicyError,
  hashPassword,
} from '../../utils/security/password.util.js';

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

async function ensureEmailAvailable(email, currentId = null) {
  const existingAdmin = await Admin.findOneByEmail(email);

  if (existingAdmin && existingAdmin.id !== currentId) {
    throw createHttpError(409, 'Email already in use.', 'ADMIN_EMAIL_ALREADY_IN_USE');
  }
}

async function ensureOwnerSafety(targetAdmin, updates = {}, actorId = null) {
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

function buildSerializedUserResponse(admin, extra = {}) {
  return {
    ...serializeAdmin(admin),
    ...extra,
  };
}

class UserService {
  async list(filters = {}) {
    const admins = await Admin.findAll(filters);
    return admins.map((admin) => buildSerializedUserResponse(admin));
  }

  async getById(id) {
    const admin = await Admin.findByPk(id);

    if (!admin) {
      throw createHttpError(404, 'Admin not found.', 'ADMIN_NOT_FOUND');
    }

    return buildSerializedUserResponse(admin);
  }

  async create(data, actor = null) {
    const normalizedEmail = normalizeEmail(data.email);
    const normalizedPassword = data.password === undefined ? '' : normalizePassword(data.password);
    const useInviteFlow = normalizedPassword.length === 0;

    await ensureEmailAvailable(normalizedEmail);

    if (useInviteFlow && data.is_active === false) {
      throw createHttpError(
        400,
        'Invited users must remain active to receive the password setup email.',
        'ADMIN_INVITE_REQUIRES_ACTIVE_USER',
      );
    }

    if (!useInviteFlow) {
      const passwordPolicyError = getPasswordPolicyError(normalizedPassword);

      if (passwordPolicyError) {
        throw createHttpError(400, passwordPolicyError, 'USER_PASSWORD_INVALID');
      }
    } else {
      await passwordActionService.ensurePasswordActionMailReady();
    }

    let inviteTokenPayload = null;
    const admin = await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const createdAdmin = await Admin.create(
        {
          name: normalizeName(data.name),
          email: normalizedEmail,
          password_hash: useInviteFlow ? null : await hashPassword(normalizedPassword),
          role: data.role,
          is_active: data.is_active ?? true,
          created_by_admin_id: actor?.id ?? null,
        },
        executor,
      );

      if (useInviteFlow) {
        inviteTokenPayload = await passwordActionService.createInviteRecordForAdmin(
          createdAdmin,
          {
            requestedByAdminId: actor?.id ?? null,
          },
          executor,
        );
      }

      return createdAdmin;
    });

    if (!useInviteFlow) {
      return buildSerializedUserResponse(admin, {
        invite_email_sent: null,
        invite_expires_at: null,
      });
    }

    const inviteDelivery = await passwordActionService.deliverInviteEmail(
      admin,
      inviteTokenPayload.plainToken,
      inviteTokenPayload.expiresAt,
    );

    return buildSerializedUserResponse(admin, {
      invite_email_sent: inviteDelivery.email_sent,
      invite_expires_at: inviteDelivery.expires_at,
    });
  }

  async update(id, data, actor = null) {
    const admin = await Admin.findByPk(id);

    if (!admin) {
      throw createHttpError(404, 'Admin not found.', 'ADMIN_NOT_FOUND');
    }

    const updateData = {};
    let shouldInvalidatePasswordTokens = false;

    if (data.name !== undefined) {
      updateData.name = normalizeName(data.name);
    }

    if (data.email !== undefined) {
      updateData.email = normalizeEmail(data.email);
      await ensureEmailAvailable(updateData.email, admin.id);
      shouldInvalidatePasswordTokens = true;
    }

    if (data.password !== undefined) {
      const normalizedPassword = normalizePassword(data.password);

      if (normalizedPassword.length > 0) {
        const passwordPolicyError = getPasswordPolicyError(normalizedPassword);

        if (passwordPolicyError) {
          throw createHttpError(400, passwordPolicyError, 'USER_PASSWORD_INVALID');
        }

        updateData.password_hash = await hashPassword(normalizedPassword);
        shouldInvalidatePasswordTokens = true;
      }
    }

    if (data.role !== undefined) {
      updateData.role = data.role;
    }

    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;

      if (data.is_active === false) {
        shouldInvalidatePasswordTokens = true;
      }
    }

    await ensureOwnerSafety(admin, updateData, actor?.id ?? null);

    const updatedAdmin = await admin.update(updateData);

    if (shouldInvalidatePasswordTokens) {
      await passwordActionService.invalidateActiveTokensByAdminId(updatedAdmin.id);
    }

    return buildSerializedUserResponse(updatedAdmin);
  }

  async resendInvite(id, actor = null) {
    await passwordActionService.ensurePasswordActionMailReady();

    const admin = await Admin.findByPk(id);

    if (!admin) {
      throw createHttpError(404, 'Admin not found.', 'ADMIN_NOT_FOUND');
    }

    const inviteDelivery = await passwordActionService.issueInviteForAdmin(admin, {
      requestedByAdminId: actor?.id ?? null,
    });

    return buildSerializedUserResponse(admin, {
      invite_email_sent: inviteDelivery.email_sent,
      invite_expires_at: inviteDelivery.expires_at,
    });
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
    return buildSerializedUserResponse(deletedAdmin);
  }
}

export default new UserService();
