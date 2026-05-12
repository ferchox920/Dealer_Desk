import {
  DEFAULT_PUBLIC_LANGUAGE,
  SUPPORTED_PUBLIC_LANGUAGES,
  getAlternatePublicLanguage,
  normalizePublicLanguage,
} from '../../constants/public-i18n.js';

function createEmptyLocalizedText() {
  return {
    en: '',
    es: '',
  };
}

function normalizeLocalizedText(value, fallbackValue = '') {
  const fallbackText = typeof fallbackValue === 'string' ? fallbackValue.trim() : '';
  const sourceValues = value?.values && typeof value.values === 'object'
    ? value.values
    : value;

  if (typeof sourceValues === 'string') {
    const normalizedValue = sourceValues.trim() || fallbackText;

    return {
      en: normalizedValue,
      es: normalizedValue,
    };
  }

  const normalizedText = SUPPORTED_PUBLIC_LANGUAGES.reduce((accumulator, language) => {
    accumulator[language] = typeof sourceValues?.[language] === 'string'
      ? sourceValues[language].trim()
      : '';
    return accumulator;
  }, createEmptyLocalizedText());

  if (fallbackText) {
    if (!normalizedText.en) {
      normalizedText.en = fallbackText;
    }

    if (!normalizedText.es) {
      normalizedText.es = fallbackText;
    }
  }

  return normalizedText;
}

function normalizeLocalizedTextField(value, options = {}) {
  return normalizeLocalizedText(value, options.fallbackValue);
}

function buildLegacyLocalizedText(value, preferredLanguage = DEFAULT_PUBLIC_LANGUAGE) {
  const normalizedValue = String(value || '').trim();
  const normalizedPreferredLanguage = normalizePublicLanguage(preferredLanguage);
  const alternateLanguage = getAlternatePublicLanguage(normalizedPreferredLanguage);

  return {
    [normalizedPreferredLanguage]: normalizedValue,
    [alternateLanguage]: normalizedValue,
  };
}

function buildLegacyLocalizedTextField(value, preferredLanguage = DEFAULT_PUBLIC_LANGUAGE) {
  return normalizeLocalizedTextField(
    buildLegacyLocalizedText(value, preferredLanguage),
  );
}

function resolveLocalizedText(value, language, fallbackValue = '') {
  const normalizedLanguage = normalizePublicLanguage(language);
  const alternateLanguage = getAlternatePublicLanguage(normalizedLanguage);
  const normalizedText = normalizeLocalizedText(value);
  const fallbackText = typeof fallbackValue === 'string' ? fallbackValue.trim() : '';

  return normalizedText[normalizedLanguage]
    || normalizedText[alternateLanguage]
    || fallbackText
    || '';
}

function getLocalizedTextSourceValue(value, fallbackValue = '', preferredLanguage = DEFAULT_PUBLIC_LANGUAGE) {
  const normalizedField = normalizeLocalizedTextField(value, {
    fallbackValue,
  });

  return resolveLocalizedText(
    normalizedField,
    preferredLanguage,
    typeof fallbackValue === 'string' ? fallbackValue : '',
  );
}

export {
  buildLegacyLocalizedText,
  buildLegacyLocalizedTextField,
  getLocalizedTextSourceValue,
  normalizeLocalizedText,
  normalizeLocalizedTextField,
  resolveLocalizedText,
};
