// ============================================================================
// password-action.template.js
//
// Template HTML/text para correos de invitacion y recuperacion.
// No buscamos un sistema de email complejo todavia: solo una base clara,
// segura y facil de mantener.
// ============================================================================

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildEmailLayout({ eyebrow, title, intro, bodyCopy, actionLabel, actionUrl, footerCopy }) {
  const safeEyebrow = escapeHtml(eyebrow);
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeBodyCopy = escapeHtml(bodyCopy);
  const safeActionLabel = escapeHtml(actionLabel);
  const safeActionUrl = escapeHtml(actionUrl);
  const safeFooterCopy = escapeHtml(footerCopy);

  return `
    <div style="background:#07111f;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#eef4ff;">
      <div style="margin:0 auto;max-width:560px;background:#0d1d33;border:1px solid rgba(138,176,255,.18);border-radius:20px;padding:32px;">
        <p style="margin:0 0 12px;color:#8db5ff;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">
          ${safeEyebrow}
        </p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.1;color:#eef4ff;">
          ${safeTitle}
        </h1>
        <p style="margin:0 0 12px;color:#dbe8ff;font-size:16px;line-height:1.6;">
          ${safeIntro}
        </p>
        <p style="margin:0 0 24px;color:#a8bedf;font-size:15px;line-height:1.6;">
          ${safeBodyCopy}
        </p>
        <a
          href="${safeActionUrl}"
          style="display:inline-block;border-radius:999px;background:#3d7aff;color:#f8fbff;padding:14px 22px;font-weight:700;text-decoration:none;"
        >
          ${safeActionLabel}
        </a>
        <p style="margin:24px 0 12px;color:#a8bedf;font-size:14px;line-height:1.6;">
          Si el boton no abre, copia y pega este enlace en tu navegador:
        </p>
        <p style="margin:0 0 20px;word-break:break-word;">
          <a href="${safeActionUrl}" style="color:#9fc0ff;text-decoration:none;">${safeActionUrl}</a>
        </p>
        <p style="margin:0;color:#7d93b4;font-size:13px;line-height:1.6;">
          ${safeFooterCopy}
        </p>
      </div>
    </div>
  `;
}

function buildInvitePasswordEmail({ actionUrl, expiresInHours }) {
  const text = [
    'Dealer Desk Admin',
    '',
    'Te invitaron a crear tu password del panel.',
    `Este enlace solo dura ${expiresInHours} horas y deja de servir despues de usarlo una vez.`,
    '',
    `Crear password: ${actionUrl}`,
  ].join('\n');

  return {
    subject: 'Activa tu acceso a Dealer Desk',
    text,
    html: buildEmailLayout({
      eyebrow: 'Invitacion segura',
      title: 'Crea tu password',
      intro: 'Recibiste este correo porque se creo tu acceso al panel de Dealer Desk.',
      bodyCopy: `Usa este enlace para definir tu password. El enlace vence en ${expiresInHours} horas y solo se puede usar una vez.`,
      actionLabel: 'Crear password',
      actionUrl,
      footerCopy: 'Si no esperabas este correo, puedes ignorarlo. Nadie podra usar este enlace despues de vencer o de completar la password.',
    }),
  };
}

function buildForgotPasswordEmail({ actionUrl, expiresInHours }) {
  const text = [
    'Dealer Desk Admin',
    '',
    'Recibimos una solicitud para restablecer tu password.',
    `Este enlace solo dura ${expiresInHours} horas y deja de servir despues de usarlo una vez.`,
    '',
    `Restablecer password: ${actionUrl}`,
  ].join('\n');

  return {
    subject: 'Restablece tu password de Dealer Desk',
    text,
    html: buildEmailLayout({
      eyebrow: 'Recuperacion segura',
      title: 'Restablece tu password',
      intro: 'Recibimos una solicitud para cambiar la password de tu cuenta del panel.',
      bodyCopy: `Si fuiste tu, abre este enlace seguro para crear una nueva password. El enlace vence en ${expiresInHours} horas y solo se puede usar una vez.`,
      actionLabel: 'Crear nueva password',
      actionUrl,
      footerCopy: 'Si no pediste este cambio, puedes ignorar este correo. Tu cuenta seguira protegida y el enlace vencera solo.',
    }),
  };
}

export {
  buildForgotPasswordEmail,
  buildInvitePasswordEmail,
};
