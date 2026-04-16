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

export { deepTrimStringValues, trimBoundaryWhitespace };
