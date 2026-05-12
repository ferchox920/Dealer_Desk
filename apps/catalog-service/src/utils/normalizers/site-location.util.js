import { trimBoundaryWhitespace } from './string-normalizer.util.js';

const SITE_LOCATION_ADDRESS_MAX_LENGTH = 180;
const SITE_LOCATION_GOOGLE_MAPS_URL_MAX_LENGTH = 500;
const GOOGLE_MAPS_HOST_REGEX = /(^|\.)google\.[a-z.]+$/i;

function collapseInternalWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeSiteLocationConfig(location) {
  return {
    address_line: collapseInternalWhitespace(location?.address_line),
    google_maps_url: trimBoundaryWhitespace(location?.google_maps_url || ''),
  };
}

function isValidGoogleMapsUrl(value) {
  try {
    const parsedUrl = new URL(value);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }

    return hostname === 'maps.app.goo.gl' || GOOGLE_MAPS_HOST_REGEX.test(hostname);
  } catch (_error) {
    return false;
  }
}

function buildGoogleMapsEmbedUrl(addressLine) {
  const normalizedAddressLine = collapseInternalWhitespace(addressLine);

  if (!normalizedAddressLine) {
    return null;
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(normalizedAddressLine)}&z=15&output=embed`;
}

export {
  SITE_LOCATION_ADDRESS_MAX_LENGTH,
  SITE_LOCATION_GOOGLE_MAPS_URL_MAX_LENGTH,
  buildGoogleMapsEmbedUrl,
  isValidGoogleMapsUrl,
  normalizeSiteLocationConfig,
};
