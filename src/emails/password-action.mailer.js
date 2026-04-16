// ============================================================================
// password-action.mailer.js
//
// Orquesta el envio de correos para setup inicial y forgot password.
// Se apoya en templates chicos y en un transporter SMTP reutilizable.
// ============================================================================

import { sendMail } from './transporter.js';
import {
  buildForgotPasswordEmail,
  buildInvitePasswordEmail,
} from './templates/password-action.template.js';

function getPasswordActionBaseUrl() {
  const explicitUrl = process.env.ADMIN_APP_PASSWORD_ACTION_URL;

  if (explicitUrl) {
    return explicitUrl;
  }

  const adminAppOrigin = process.env.ADMIN_APP_ORIGIN || 'http://localhost:3001';
  return `${adminAppOrigin.replace(/\/$/, '')}/password-action`;
}

function buildPasswordActionUrl(token) {
  const baseUrl = new URL(getPasswordActionBaseUrl());
  baseUrl.searchParams.set('token', token);
  return baseUrl.toString();
}

function getPasswordActionTokenTtlHours() {
  return Number(process.env.PASSWORD_ACTION_TOKEN_TTL_HOURS || 12);
}

async function sendInvitePasswordEmail({ to, token }) {
  const actionUrl = buildPasswordActionUrl(token);
  const email = buildInvitePasswordEmail({
    actionUrl,
    expiresInHours: getPasswordActionTokenTtlHours(),
  });

  return await sendMail({
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}

async function sendForgotPasswordEmail({ to, token }) {
  const actionUrl = buildPasswordActionUrl(token);
  const email = buildForgotPasswordEmail({
    actionUrl,
    expiresInHours: getPasswordActionTokenTtlHours(),
  });

  return await sendMail({
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}

export {
  buildPasswordActionUrl,
  getPasswordActionTokenTtlHours,
  sendForgotPasswordEmail,
  sendInvitePasswordEmail,
};
