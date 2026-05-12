const WHATSAPP_PHONE_INPUT_REGEX = /^\+?[\d\s()-]*$/;
const WHATSAPP_PHONE_NORMALIZED_REGEX = /^[1-9]\d{7,14}$/;
const WHATSAPP_MESSAGE_MAX_LENGTH = 280;

function trimWhatsappMessage(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function isWhatsappPhoneInputShapeValid(value) {
  return WHATSAPP_PHONE_INPUT_REGEX.test(String(value ?? '').trim());
}

function normalizeWhatsappPhoneNumber(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^\d]/g, '');
}

function isWhatsappPhoneNumberNormalizedValid(value) {
  return WHATSAPP_PHONE_NORMALIZED_REGEX.test(String(value ?? ''));
}

function buildWhatsappContactUrl(phoneNumber, prefilledMessage = '') {
  const normalizedPhoneNumber = normalizeWhatsappPhoneNumber(phoneNumber);

  if (!isWhatsappPhoneNumberNormalizedValid(normalizedPhoneNumber)) {
    return null;
  }

  const normalizedMessage = trimWhatsappMessage(prefilledMessage);
  const baseUrl = `https://wa.me/${normalizedPhoneNumber}`;

  if (!normalizedMessage) {
    return baseUrl;
  }

  return `${baseUrl}?text=${encodeURIComponent(normalizedMessage)}`;
}

export {
  WHATSAPP_MESSAGE_MAX_LENGTH,
  buildWhatsappContactUrl,
  isWhatsappPhoneInputShapeValid,
  isWhatsappPhoneNumberNormalizedValid,
  normalizeWhatsappPhoneNumber,
  trimWhatsappMessage,
};
