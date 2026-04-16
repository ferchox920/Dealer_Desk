function trimBoundaryWhitespace(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

function deepTrimStringValues(value) {
  if (typeof value === 'string') {
    return trimBoundaryWhitespace(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepTrimStringValues(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, deepTrimStringValues(nestedValue)]),
  );
}

function normalizeSlug(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return '';
  }

  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export { deepTrimStringValues, normalizeSlug, trimBoundaryWhitespace };
