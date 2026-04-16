// ============================================================================
// product-ranges.js
//
// Reglas numéricas y de moneda para productos.
// Se comparten entre validaciones HTTP, services y checks de PostgreSQL
// para que la API y la DB hablen exactamente el mismo idioma.
// ============================================================================

const DEFAULT_PRODUCT_CURRENCY = 'USD';
const PRODUCT_CURRENCY_CODES = ['CLP', 'USD'];

const PRODUCT_YEAR_MIN = 1886;
const PRODUCT_MILEAGE_MIN = 0;
const PRODUCT_MILEAGE_MAX = 2000000;

const PRODUCT_PRICE_RANGES = {
  USD: {
    min: 500,
    max: 100000,
  },
  CLP: {
    min: 500000,
    max: 100000000,
  },
};

function getProductYearMax(now = new Date()) {
  return now.getFullYear() + 1;
}

function normalizeProductCurrencyCode(currencyCode, fallbackCurrencyCode = DEFAULT_PRODUCT_CURRENCY) {
  const rawValue = currencyCode === undefined ? fallbackCurrencyCode : currencyCode;
  return String(rawValue).toUpperCase();
}

function getProductPriceRange(currencyCode, fallbackCurrencyCode = DEFAULT_PRODUCT_CURRENCY) {
  const normalizedCurrencyCode = normalizeProductCurrencyCode(currencyCode, fallbackCurrencyCode);
  return PRODUCT_PRICE_RANGES[normalizedCurrencyCode] ?? null;
}

export {
  DEFAULT_PRODUCT_CURRENCY,
  PRODUCT_CURRENCY_CODES,
  PRODUCT_MILEAGE_MAX,
  PRODUCT_MILEAGE_MIN,
  PRODUCT_PRICE_RANGES,
  PRODUCT_YEAR_MIN,
  getProductPriceRange,
  getProductYearMax,
  normalizeProductCurrencyCode,
};
