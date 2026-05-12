import crypto from 'node:crypto';

const SECRET_ENCRYPTION_KEY_ENV = 'PLATFORM_SECRET_ENCRYPTION_KEY';
const CIPHER_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getSecretKeyMaterial() {
  const rawKey = process.env[SECRET_ENCRYPTION_KEY_ENV];

  if (typeof rawKey !== 'string' || rawKey.trim().length < 32) {
    throw new Error(`${SECRET_ENCRYPTION_KEY_ENV} must be set with at least 32 characters.`);
  }

  return crypto.createHash('sha256').update(rawKey.trim()).digest();
}

function encryptSecret(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Secret value is required.');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, getSecretKeyMaterial(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    v: 1,
    alg: CIPHER_ALGORITHM,
    iv: iv.toString('base64'),
    tag: authTag.toString('base64'),
    data: encrypted.toString('base64'),
  });
}

function hashSecret(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Secret value is required.');
  }

  return crypto
    .createHmac('sha256', getSecretKeyMaterial())
    .update(value)
    .digest('hex');
}

export {
  encryptSecret,
  hashSecret,
};
