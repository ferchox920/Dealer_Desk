export function formatBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat('es-CL').format(Number(value) || 0);
}

export function formatProductPrice(value, currencyCode = 'USD') {
  const normalizedCurrency = String(currencyCode || 'USD').toUpperCase();
  const locale = normalizedCurrency === 'CLP' ? 'es-CL' : 'en-US';
  const formattedValue = new Intl.NumberFormat(locale).format(Number(value) || 0);

  return `${normalizedCurrency} $ ${formattedValue}`;
}

export function formatDateTime(value) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
