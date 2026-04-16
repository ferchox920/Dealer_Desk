import nodemailer from 'nodemailer';

let cachedTransporter = null;
let cachedVerifyPromise = null;
const MAIL_CONFIG_HINT = 'Set MAIL_SERVICE or MAIL_HOST, plus MAIL_USER and MAIL_PASS. This project also accepts EMAIL_NODEMAIL and TOKEN_GMAIL as aliases.';

function normalizeEnvValue(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function getGenericMailConfig() {
  const service = normalizeEnvValue(process.env.MAIL_SERVICE);
  const host = normalizeEnvValue(process.env.MAIL_HOST);
  const user = normalizeEnvValue(process.env.MAIL_USER);
  const pass = normalizeEnvValue(process.env.MAIL_PASS);

  const hasAnyValue = Boolean(service || host || user || pass);
  const isReady = Boolean((service || host) && user && pass);

  return {
    hasAnyValue,
    isReady,
    service,
    host,
    user,
    pass,
  };
}

function getAliasMailConfig() {
  const user = normalizeEnvValue(process.env.EMAIL_NODEMAIL);
  const pass = normalizeEnvValue(process.env.TOKEN_GMAIL);
  const hasAnyValue = Boolean(user || pass);
  const isReady = Boolean(user && pass);

  return {
    hasAnyValue,
    isReady,
    service: 'Gmail',
    host: null,
    user,
    pass,
  };
}

function getResolvedMailConfig() {
  const genericConfig = getGenericMailConfig();
  const aliasConfig = getAliasMailConfig();

  if (genericConfig.hasAnyValue && aliasConfig.hasAnyValue) {
    throw new Error(
      'Conflicting mail configuration detected. Use either MAIL_* variables or EMAIL_NODEMAIL/TOKEN_GMAIL, but not both at the same time.',
    );
  }

  if (genericConfig.isReady) {
    return genericConfig;
  }

  if (aliasConfig.isReady) {
    return aliasConfig;
  }

  return null;
}

function isMailConfigured() {
  return Boolean(getResolvedMailConfig());
}

function getMailFromAddress() {
  return normalizeEnvValue(process.env.MAIL_FROM) || getResolvedMailConfig()?.user || null;
}

function buildTransportOptions() {
  const resolvedConfig = getResolvedMailConfig();
  const port = Number(process.env.MAIL_PORT || 587);
  const secure = process.env.MAIL_SECURE === 'true' || port === 465;

  if (!resolvedConfig) {
    throw new Error(`Mail transport is not configured. ${MAIL_CONFIG_HINT}`);
  }

  if (resolvedConfig.service) {
    return {
      service: resolvedConfig.service,
      auth: {
        user: resolvedConfig.user,
        pass: resolvedConfig.pass,
      },
    };
  }

  return {
    host: resolvedConfig.host,
    port,
    secure,
    auth: {
      user: resolvedConfig.user,
      pass: resolvedConfig.pass,
    },
  };
}

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport(
      buildTransportOptions(),
      {
        from: getMailFromAddress(),
      },
    );
  }

  return cachedTransporter;
}

async function ensureMailerReady() {
  if (!isMailConfigured()) {
    throw new Error(`Mail transport is not configured. ${MAIL_CONFIG_HINT}`);
  }

  if (!cachedVerifyPromise) {
    cachedVerifyPromise = getTransporter()
      .verify()
      .catch((error) => {
        cachedVerifyPromise = null;
        throw error;
      });
  }

  return await cachedVerifyPromise;
}

async function sendMail(message) {
  await ensureMailerReady();
  return await getTransporter().sendMail({
    from: getMailFromAddress(),
    ...message,
  });
}

export {
  MAIL_CONFIG_HINT,
  ensureMailerReady,
  getMailFromAddress,
  isMailConfigured,
  sendMail,
};
