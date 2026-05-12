import {
  SITE_CONTENT_DAY_KEYS,
  SITE_CONTENT_SECTION_KEYS,
  SITE_CONTENT_SOCIAL_LINK_KEYS,
  SITE_CONTENT_TEXT_LIMITS,
} from '../../../constants/site-content.js';
import { SUPPORTED_PUBLIC_LANGUAGES } from '../../../constants/public-i18n.js';
import {
  WHATSAPP_MESSAGE_MAX_LENGTH,
  isWhatsappPhoneInputShapeValid,
  isWhatsappPhoneNumberNormalizedValid,
  normalizeWhatsappPhoneNumber,
  trimWhatsappMessage,
} from '../../normalizers/whatsapp.util.js';
import {
  SITE_LOCATION_ADDRESS_MAX_LENGTH,
  SITE_LOCATION_GOOGLE_MAPS_URL_MAX_LENGTH,
  isValidGoogleMapsUrl,
} from '../../normalizers/site-location.util.js';

const TIME_VALUE_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pushError(errors, code, field, message) {
  errors.push({ code, field, message });
}

function isValidHttpUrl(value) {
  try {
    const parsedUrl = new URL(value);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (_error) {
    return false;
  }
}

function validateLocalizedText(value, fieldPrefix, errors, options = {}) {
  const { allowEmpty = true, maxLength } = options;

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pushError(errors, 'LOCALIZED_TEXT_INVALID', fieldPrefix, 'The localized text field must be an object.');
    return;
  }

  const values = value.values && typeof value.values === 'object' && !Array.isArray(value.values)
    ? value.values
    : value;

  for (const language of SUPPORTED_PUBLIC_LANGUAGES) {
    const localizedValue = values[language];

    if (localizedValue !== undefined && typeof localizedValue !== 'string') {
      pushError(
        errors,
        'LOCALIZED_TEXT_VALUE_INVALID',
        `${fieldPrefix}.${language}`,
        `The ${language} localized value must be a string.`,
      );
      continue;
    }

    const trimmedValue = String(localizedValue || '').trim();

    if (!allowEmpty && trimmedValue.length === 0) {
      pushError(
        errors,
        'LOCALIZED_TEXT_VALUE_REQUIRED',
        `${fieldPrefix}.${language}`,
        `The ${language} localized value is required.`,
      );
    }

    if (maxLength && trimmedValue.length > maxLength) {
      pushError(
        errors,
        'LOCALIZED_TEXT_VALUE_TOO_LONG',
        `${fieldPrefix}.${language}`,
        `The ${language} localized value must be ${maxLength} characters or less.`,
      );
    }
  }
}

function validateBoundedString(value, field, errors, options = {}) {
  const { allowEmpty = false, maxLength } = options;

  if (typeof value !== 'string') {
    pushError(errors, `${field.toUpperCase()}_INVALID`, field, `The ${field} must be a string.`);
    return;
  }

  const trimmedValue = value.trim();

  if (!allowEmpty && trimmedValue.length === 0) {
    pushError(errors, `${field.toUpperCase()}_REQUIRED`, field, `The ${field} is required.`);
    return;
  }

  if (maxLength && trimmedValue.length > maxLength) {
    pushError(errors, `${field.toUpperCase()}_TOO_LONG`, field, `The ${field} must be ${maxLength} characters or less.`);
  }
}

function validateHeroConfig(hero, errors) {
  if (!hero || typeof hero !== 'object' || Array.isArray(hero)) {
    pushError(errors, 'SITE_CONTENT_HERO_INVALID', 'hero', 'The hero field must be an object.');
    return;
  }

  validateBoundedString(hero.eyebrow, 'hero.eyebrow', errors, { maxLength: SITE_CONTENT_TEXT_LIMITS.hero_eyebrow });
  validateLocalizedText(hero.eyebrow_i18n, 'hero.eyebrow_i18n', errors, { maxLength: SITE_CONTENT_TEXT_LIMITS.hero_eyebrow });
  validateBoundedString(hero.title, 'hero.title', errors, { maxLength: SITE_CONTENT_TEXT_LIMITS.hero_title });
  validateLocalizedText(hero.title_i18n, 'hero.title_i18n', errors, { maxLength: SITE_CONTENT_TEXT_LIMITS.hero_title });
  validateBoundedString(hero.description, 'hero.description', errors, { maxLength: SITE_CONTENT_TEXT_LIMITS.hero_description });
  validateLocalizedText(hero.description_i18n, 'hero.description_i18n', errors, { maxLength: SITE_CONTENT_TEXT_LIMITS.hero_description });
}

function validateServiceItem(service, index, errors) {
  const slot = index + 1;
  const fieldPrefix = `services.${slot}`;

  if (!service || typeof service !== 'object' || Array.isArray(service)) {
    pushError(errors, 'SITE_CONTENT_SERVICE_INVALID', fieldPrefix, 'Each service must be an object.');
    return;
  }

  if (service.slot !== slot) {
    pushError(errors, 'SITE_CONTENT_SERVICE_SLOT_INVALID', `${fieldPrefix}.slot`, `The slot must be ${slot}.`);
  }

  if (typeof service.is_active !== 'boolean') {
    pushError(errors, 'SITE_CONTENT_SERVICE_ACTIVE_INVALID', `${fieldPrefix}.is_active`, 'The service is_active field must be a boolean.');
  }

  validateBoundedString(service.title, `${fieldPrefix}.title`, errors, {
    allowEmpty: !service.is_active,
    maxLength: SITE_CONTENT_TEXT_LIMITS.service_title,
  });
  validateLocalizedText(service.title_i18n, `${fieldPrefix}.title_i18n`, errors, {
    maxLength: SITE_CONTENT_TEXT_LIMITS.service_title,
  });
  validateBoundedString(service.description, `${fieldPrefix}.description`, errors, {
    allowEmpty: !service.is_active,
    maxLength: SITE_CONTENT_TEXT_LIMITS.service_description,
  });
  validateLocalizedText(service.description_i18n, `${fieldPrefix}.description_i18n`, errors, {
    maxLength: SITE_CONTENT_TEXT_LIMITS.service_description,
  });
}

function validateHoursDay(day, index, errors) {
  const fieldPrefix = `hours.${SITE_CONTENT_DAY_KEYS[index]}`;
  const expectedDayKey = SITE_CONTENT_DAY_KEYS[index];

  if (!day || typeof day !== 'object' || Array.isArray(day)) {
    pushError(errors, 'SITE_CONTENT_HOURS_DAY_INVALID', fieldPrefix, 'Each hours row must be an object.');
    return;
  }

  if (day.day_key !== expectedDayKey) {
    pushError(errors, 'SITE_CONTENT_DAY_KEY_INVALID', `${fieldPrefix}.day_key`, `The day_key must be ${expectedDayKey}.`);
  }

  if (typeof day.is_closed !== 'boolean') {
    pushError(errors, 'SITE_CONTENT_DAY_CLOSED_INVALID', `${fieldPrefix}.is_closed`, 'The is_closed field must be a boolean.');
  }

  if (day.is_closed) {
    if (day.open_time !== null || day.close_time !== null) {
      pushError(errors, 'SITE_CONTENT_DAY_CLOSED_TIMES_INVALID', fieldPrefix, 'Closed days must use null for open_time and close_time.');
    }
    return;
  }

  if (typeof day.open_time !== 'string' || !TIME_VALUE_REGEX.test(day.open_time)) {
    pushError(errors, 'SITE_CONTENT_DAY_OPEN_TIME_INVALID', `${fieldPrefix}.open_time`, 'The open_time must use HH:MM format.');
  }

  if (typeof day.close_time !== 'string' || !TIME_VALUE_REGEX.test(day.close_time)) {
    pushError(errors, 'SITE_CONTENT_DAY_CLOSE_TIME_INVALID', `${fieldPrefix}.close_time`, 'The close_time must use HH:MM format.');
  }
}

function validateSocialLinkItem(link, index, errors) {
  const expectedKey = SITE_CONTENT_SOCIAL_LINK_KEYS[index];
  const fieldPrefix = `social_links.${expectedKey}`;

  if (!link || typeof link !== 'object' || Array.isArray(link)) {
    pushError(errors, 'SITE_CONTENT_SOCIAL_LINK_INVALID', fieldPrefix, 'Each social link must be an object.');
    return;
  }

  if (link.key !== expectedKey) {
    pushError(errors, 'SITE_CONTENT_SOCIAL_LINK_KEY_INVALID', `${fieldPrefix}.key`, `The social link key must be ${expectedKey}.`);
  }

  if (typeof link.is_active !== 'boolean') {
    pushError(errors, 'SITE_CONTENT_SOCIAL_LINK_ACTIVE_INVALID', `${fieldPrefix}.is_active`, 'The is_active field must be a boolean.');
  }

  if (typeof link.url !== 'string') {
    pushError(errors, 'SITE_CONTENT_SOCIAL_LINK_URL_INVALID', `${fieldPrefix}.url`, 'The social link URL must be a string.');
    return;
  }

  const trimmedUrl = link.url.trim();

  if (link.is_active && trimmedUrl.length === 0) {
    pushError(errors, 'SITE_CONTENT_SOCIAL_LINK_URL_REQUIRED', `${fieldPrefix}.url`, 'The social link URL is required when the network is active.');
    return;
  }

  if (trimmedUrl.length > 0 && !isValidHttpUrl(trimmedUrl)) {
    pushError(errors, 'SITE_CONTENT_SOCIAL_LINK_URL_INVALID', `${fieldPrefix}.url`, 'The social link URL must be a valid http or https URL.');
  }
}

function validateWhatsappConfig(whatsapp, errors) {
  const fieldPrefix = 'whatsapp';

  if (!whatsapp || typeof whatsapp !== 'object' || Array.isArray(whatsapp)) {
    pushError(errors, 'SITE_CONTENT_WHATSAPP_INVALID', fieldPrefix, 'The whatsapp field must be an object.');
    return;
  }

  if (typeof whatsapp.is_active !== 'boolean') {
    pushError(errors, 'SITE_CONTENT_WHATSAPP_ACTIVE_INVALID', `${fieldPrefix}.is_active`, 'The whatsapp is_active field must be a boolean.');
  }

  if (typeof whatsapp.phone_number !== 'string') {
    pushError(errors, 'SITE_CONTENT_WHATSAPP_PHONE_INVALID', `${fieldPrefix}.phone_number`, 'The whatsapp phone_number field must be a string.');
  } else {
    const trimmedPhoneNumber = whatsapp.phone_number.trim();

    if (whatsapp.is_active && trimmedPhoneNumber.length === 0) {
      pushError(errors, 'SITE_CONTENT_WHATSAPP_PHONE_REQUIRED', `${fieldPrefix}.phone_number`, 'The whatsapp phone_number is required when the button is active.');
    } else if (trimmedPhoneNumber.length > 0) {
      if (!isWhatsappPhoneInputShapeValid(trimmedPhoneNumber)) {
        pushError(errors, 'SITE_CONTENT_WHATSAPP_PHONE_FORMAT_INVALID', `${fieldPrefix}.phone_number`, 'Use digits, spaces, parentheses, hyphen, and an optional leading + only.');
      } else if (!isWhatsappPhoneNumberNormalizedValid(normalizeWhatsappPhoneNumber(trimmedPhoneNumber))) {
        pushError(errors, 'SITE_CONTENT_WHATSAPP_PHONE_LENGTH_INVALID', `${fieldPrefix}.phone_number`, 'Use a full country code and between 8 and 15 digits total.');
      }
    }
  }

  if (typeof whatsapp.prefilled_message !== 'string') {
    pushError(errors, 'SITE_CONTENT_WHATSAPP_MESSAGE_INVALID', `${fieldPrefix}.prefilled_message`, 'The whatsapp prefilled_message field must be a string.');
    return;
  }

  if (trimWhatsappMessage(whatsapp.prefilled_message).length > WHATSAPP_MESSAGE_MAX_LENGTH) {
    pushError(errors, 'SITE_CONTENT_WHATSAPP_MESSAGE_TOO_LONG', `${fieldPrefix}.prefilled_message`, `The whatsapp prefilled_message must be ${WHATSAPP_MESSAGE_MAX_LENGTH} characters or less.`);
  }
}

function validateLocationConfig(location, errors) {
  const fieldPrefix = 'location';

  if (!location || typeof location !== 'object' || Array.isArray(location)) {
    pushError(errors, 'SITE_CONTENT_LOCATION_INVALID', fieldPrefix, 'The location field must be an object.');
    return;
  }

  if (typeof location.address_line !== 'string') {
    pushError(errors, 'SITE_CONTENT_LOCATION_ADDRESS_INVALID', `${fieldPrefix}.address_line`, 'The address_line field must be a string.');
  } else {
    const trimmedAddressLine = location.address_line.trim();

    if (trimmedAddressLine.length === 0) {
      pushError(errors, 'SITE_CONTENT_LOCATION_ADDRESS_REQUIRED', `${fieldPrefix}.address_line`, 'The address_line is required.');
    } else if (trimmedAddressLine.length > SITE_LOCATION_ADDRESS_MAX_LENGTH) {
      pushError(errors, 'SITE_CONTENT_LOCATION_ADDRESS_TOO_LONG', `${fieldPrefix}.address_line`, `The address_line must be ${SITE_LOCATION_ADDRESS_MAX_LENGTH} characters or less.`);
    }
  }

  if (typeof location.google_maps_url !== 'string') {
    pushError(errors, 'SITE_CONTENT_LOCATION_MAPS_URL_INVALID', `${fieldPrefix}.google_maps_url`, 'The google_maps_url field must be a string.');
    return;
  }

  const trimmedGoogleMapsUrl = location.google_maps_url.trim();

  if (trimmedGoogleMapsUrl.length === 0) {
    pushError(errors, 'SITE_CONTENT_LOCATION_MAPS_URL_REQUIRED', `${fieldPrefix}.google_maps_url`, 'The google_maps_url is required.');
  } else if (trimmedGoogleMapsUrl.length > SITE_LOCATION_GOOGLE_MAPS_URL_MAX_LENGTH) {
    pushError(errors, 'SITE_CONTENT_LOCATION_MAPS_URL_TOO_LONG', `${fieldPrefix}.google_maps_url`, `The google_maps_url must be ${SITE_LOCATION_GOOGLE_MAPS_URL_MAX_LENGTH} characters or less.`);
  } else if (!isValidGoogleMapsUrl(trimmedGoogleMapsUrl)) {
    pushError(errors, 'SITE_CONTENT_LOCATION_MAPS_URL_NOT_GOOGLE', `${fieldPrefix}.google_maps_url`, 'Use a valid Google Maps link.');
  }
}

function validateSectionsConfig(sections, errors) {
  const fieldPrefix = 'sections';

  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) {
    pushError(errors, 'SITE_CONTENT_SECTIONS_INVALID', fieldPrefix, 'The sections field must be an object.');
    return;
  }

  SITE_CONTENT_SECTION_KEYS.forEach((sectionKey) => {
    if (typeof sections[sectionKey] !== 'boolean') {
      pushError(errors, 'SITE_CONTENT_SECTION_FLAG_INVALID', `${fieldPrefix}.${sectionKey}`, `The ${sectionKey} visibility flag must be a boolean.`);
    }
  });
}

function collectSiteContentValidationErrors(payload) {
  const errors = [];
  const {
    hero,
    about_body: aboutBody,
    about_body_i18n: aboutBodyI18n,
    services,
    footer_summary: footerSummary,
    footer_summary_i18n: footerSummaryI18n,
    hours,
    social_links: socialLinks,
    whatsapp,
    location,
    sections,
  } = payload;

  validateHeroConfig(hero, errors);
  validateBoundedString(aboutBody, 'about_body', errors, { maxLength: SITE_CONTENT_TEXT_LIMITS.about_body });
  validateLocalizedText(aboutBodyI18n, 'about_body_i18n', errors, { maxLength: SITE_CONTENT_TEXT_LIMITS.about_body });

  if (!Array.isArray(services) || services.length !== 3) {
    pushError(errors, 'SITE_CONTENT_SERVICES_INVALID', 'services', 'The services array must contain exactly 3 items.');
  } else {
    services.forEach((service, index) => validateServiceItem(service, index, errors));
  }

  validateBoundedString(footerSummary, 'footer_summary', errors, { maxLength: SITE_CONTENT_TEXT_LIMITS.footer_summary });
  validateLocalizedText(footerSummaryI18n, 'footer_summary_i18n', errors, { maxLength: SITE_CONTENT_TEXT_LIMITS.footer_summary });

  if (!Array.isArray(hours) || hours.length !== SITE_CONTENT_DAY_KEYS.length) {
    pushError(errors, 'SITE_CONTENT_HOURS_INVALID', 'hours', `The hours array must contain exactly ${SITE_CONTENT_DAY_KEYS.length} items.`);
  } else {
    hours.forEach((day, index) => validateHoursDay(day, index, errors));
  }

  if (!Array.isArray(socialLinks) || socialLinks.length !== SITE_CONTENT_SOCIAL_LINK_KEYS.length) {
    pushError(errors, 'SITE_CONTENT_SOCIAL_LINKS_INVALID', 'social_links', `The social_links array must contain exactly ${SITE_CONTENT_SOCIAL_LINK_KEYS.length} items.`);
  } else {
    socialLinks.forEach((link, index) => validateSocialLinkItem(link, index, errors));
  }

  validateWhatsappConfig(whatsapp, errors);
  validateLocationConfig(location, errors);
  validateSectionsConfig(sections, errors);

  return errors;
}

function validateUpdateSiteContent(req, res, next) {
  const errors = collectSiteContentValidationErrors(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      status: 400,
      errors,
    });
  }

  return next();
}

export {
  collectSiteContentValidationErrors,
  validateUpdateSiteContent,
};
