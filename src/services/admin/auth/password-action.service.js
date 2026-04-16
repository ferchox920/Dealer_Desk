// ============================================================================
// password-action.service.js
//
// Maneja los flujos de password por correo:
//  - invitacion inicial
//  - forgot password
//  - verificacion del enlace
//  - completar password con un token de un solo uso
//
// Objetivo: resolver el caso real sin reinventar la rueda:
// token opaco + hash en DB + expiracion + invalidez tras uso.
// ============================================================================

import db from '../../../config/db/db.js';
import {
  MAIL_CONFIG_HINT,
  ensureMailerReady,
  isMailConfigured,
} from '../../../emails/transporter.js';
import {
  getPasswordActionTokenTtlHours,
  sendForgotPasswordEmail,
  sendInvitePasswordEmail,
} from '../../../emails/password-action.mailer.js';
import Admin from '../../../entities/admin.entity.js';
import PasswordActionToken from '../../../entities/password-action-token.entity.js';
import { createHttpError } from '../../../utils/errors/app-error.util.js';
import { trimBoundaryWhitespace } from '../../../utils/normalizers/string-normalizer.util.js';
import { serializeAdmin } from '../../../utils/serializers/admin.serializer.js';
import {
  getPasswordPolicyError,
  hashPassword,
} from '../../../utils/security/password.util.js';
import {
  generateOpaqueActionToken,
  sha256,
} from '../../../utils/security/token.util.js';

const PASSWORD_ACTION_PURPOSES = {
  invite: 'invite',
  forgotPassword: 'forgot_password',
};

function normalizeEmail(email) {
  return trimBoundaryWhitespace(email).toLowerCase();
}

function normalizePassword(password) {
  return trimBoundaryWhitespace(password);
}

function normalizeToken(token) {
  return trimBoundaryWhitespace(token);
}

function buildPasswordActionExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + getPasswordActionTokenTtlHours());
  return expiresAt;
}

function buildInvalidPasswordActionError() {
  return createHttpError(
    410,
    'This password link is invalid or expired.',
    'PASSWORD_ACTION_TOKEN_INVALID_OR_EXPIRED',
  );
}

function logMailFailure(context, error) {
  console.error(`[mail:${context}] ${error.message}`);
}

function buildInviteDeliveryResult(admin, { emailSent, emailStatus, expiresAt = null }) {
  return {
    admin: serializeAdmin(admin),
    email_sent: emailSent,
    email_status: emailStatus,
    expires_at: expiresAt,
  };
}

async function createPasswordActionRecord(
  {
    admin,
    purpose,
    requestedByAdminId = null,
  },
  executor,
) {
  const plainToken = generateOpaqueActionToken();
  const expiresAt = buildPasswordActionExpiryDate();

  // Dejamos una sola llave viva por admin para evitar enlaces compitiendo.
  await PasswordActionToken.markAllActiveAsUsedByAdminId(admin.id, executor);

  await PasswordActionToken.create(
    {
      admin_id: admin.id,
      purpose,
      token_hash: sha256(plainToken),
      delivery_email: admin.email,
      requested_by_admin_id: requestedByAdminId,
      expires_at: expiresAt,
    },
    executor,
  );

  return {
    plainToken,
    expiresAt,
  };
}

class PasswordActionService {
  async ensurePasswordActionMailReady() {
    if (!isMailConfigured()) {
      throw createHttpError(
        503,
        `Password emails are not available right now. ${MAIL_CONFIG_HINT}`,
        'PASSWORD_EMAILS_UNAVAILABLE',
      );
    }

    try {
      await ensureMailerReady();
    } catch (error) {
      console.error(`[mail:verify] ${error.message}`);

      throw createHttpError(
        503,
        'Password emails are configured but the SMTP connection is failing right now. Check the configured mail credentials and server settings.',
        'PASSWORD_EMAILS_UNAVAILABLE',
      );
    }
  }

  async invalidateActiveTokensByAdminId(adminId) {
    await PasswordActionToken.markAllActiveAsUsedByAdminId(adminId);
  }

  assertInvitePreconditions(admin) {
    if (!admin) {
      throw createHttpError(404, 'Admin not found.', 'ADMIN_NOT_FOUND');
    }

    if (!admin.is_active) {
      throw createHttpError(400, 'Inactive users cannot receive invite emails.', 'ADMIN_INACTIVE_FOR_INVITE');
    }

    if (admin.password_hash) {
      throw createHttpError(400, 'This user already has a password.', 'ADMIN_PASSWORD_ALREADY_SET');
    }
  }

  async createInviteRecordForAdmin(admin, options = {}, executor) {
    this.assertInvitePreconditions(admin);

    const requestedByAdminId = options.requestedByAdminId ?? null;
    return await createPasswordActionRecord(
      {
        admin,
        purpose: PASSWORD_ACTION_PURPOSES.invite,
        requestedByAdminId,
      },
      executor,
    );
  }

  async deliverInviteEmail(admin, plainToken, expiresAt) {
    try {
      await sendInvitePasswordEmail({
        to: admin.email,
        token: plainToken,
      });

      return buildInviteDeliveryResult(admin, {
        emailSent: true,
        emailStatus: 'sent',
        expiresAt,
      });
    } catch (error) {
      logMailFailure('invite', error);

      return buildInviteDeliveryResult(admin, {
        emailSent: false,
        emailStatus: 'delivery_failed',
        expiresAt,
      });
    }
  }

  async issueInviteForAdmin(admin, options = {}) {
    const tokenPayload = await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);

      return await this.createInviteRecordForAdmin(admin, options, executor);
    });

    return await this.deliverInviteEmail(admin, tokenPayload.plainToken, tokenPayload.expiresAt);
  }

  // Forgot password SIEMPRE responde igual desde el punto de vista externo.
  // Asi no revelamos si el email existe o no.
  async requestForgotPassword({ email }) {
    const normalizedEmail = normalizeEmail(email);
    const admin = await Admin.findOneByEmail(normalizedEmail);

    if (!admin || !admin.is_active) {
      return {
        accepted: true,
        email_sent: false,
      };
    }

    if (!isMailConfigured()) {
      console.error('[mail:forgot-password] Mail transport is not configured.');

      return {
        accepted: true,
        email_sent: false,
      };
    }

    const tokenPayload = await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);

      return await createPasswordActionRecord(
        {
          admin,
          purpose: PASSWORD_ACTION_PURPOSES.forgotPassword,
        },
        executor,
      );
    });

    try {
      await sendForgotPasswordEmail({
        to: admin.email,
        token: tokenPayload.plainToken,
      });

      return {
        accepted: true,
        email_sent: true,
      };
    } catch (error) {
      logMailFailure('forgot-password', error);

      return {
        accepted: true,
        email_sent: false,
      };
    }
  }

  async verifyPasswordAction({ token }) {
    const normalizedToken = normalizeToken(token);
    const tokenRecord = await PasswordActionToken.findActiveByTokenHash(sha256(normalizedToken));

    if (!tokenRecord) {
      throw buildInvalidPasswordActionError();
    }

    const admin = await Admin.findByPk(tokenRecord.admin_id);

    if (!admin || !admin.is_active) {
      throw buildInvalidPasswordActionError();
    }

    return {
      email: tokenRecord.delivery_email || admin.email,
      purpose: tokenRecord.purpose,
      expires_at: tokenRecord.expires_at,
    };
  }

  async completePasswordAction({ token, password }) {
    const normalizedToken = normalizeToken(token);
    const normalizedPassword = normalizePassword(password);
    const passwordPolicyError = getPasswordPolicyError(normalizedPassword);

    if (passwordPolicyError) {
      throw createHttpError(400, passwordPolicyError, 'AUTH_PASSWORD_POLICY_INVALID');
    }

    await db.withTransaction(async (client) => {
      const executor = client.query.bind(client);
      const tokenRecord = await PasswordActionToken.findActiveByTokenHash(
        sha256(normalizedToken),
        { forUpdate: true },
        executor,
      );

      if (!tokenRecord) {
        throw buildInvalidPasswordActionError();
      }

      const admin = await Admin.findByPk(tokenRecord.admin_id, executor);

      if (!admin || !admin.is_active) {
        throw buildInvalidPasswordActionError();
      }

      await Admin.update(
        admin.id,
        {
          password_hash: await hashPassword(normalizedPassword),
        },
        executor,
      );

      // Consumimos el enlace actual y cualquier otro pendiente del mismo admin.
      await PasswordActionToken.markAllActiveAsUsedByAdminId(admin.id, executor);
    });

    return {
      message: 'Password updated successfully.',
    };
  }
}

export {
  PASSWORD_ACTION_PURPOSES,
};

export default new PasswordActionService();
