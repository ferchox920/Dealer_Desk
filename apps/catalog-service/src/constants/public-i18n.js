const DEFAULT_PUBLIC_LANGUAGE = 'en';
const SUPPORTED_PUBLIC_LANGUAGES = ['en', 'es'];

function normalizePublicLanguage(value) {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (SUPPORTED_PUBLIC_LANGUAGES.includes(normalizedValue)) {
    return normalizedValue;
  }

  return DEFAULT_PUBLIC_LANGUAGE;
}

function getAlternatePublicLanguage(language) {
  const normalizedLanguage = normalizePublicLanguage(language);
  return normalizedLanguage === 'en' ? 'es' : 'en';
}

export {
  DEFAULT_PUBLIC_LANGUAGE,
  SUPPORTED_PUBLIC_LANGUAGES,
  getAlternatePublicLanguage,
  normalizePublicLanguage,
};
