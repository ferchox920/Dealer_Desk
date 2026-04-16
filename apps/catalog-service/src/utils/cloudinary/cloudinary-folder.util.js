// ============================================================================
// cloudinary-folder.util.js
//
// Utilidad para construir las rutas de carpetas en Cloudinary.
// Cada producto tiene su propia carpeta, organizada dentro de la carpeta
// del sistema (tenant/dealer) al que pertenece.
//
// Estructura de carpetas en Cloudinary:
//   dealer_desk/{systemFolder}/{productId}
//
// Ejemplo real:
//   dealer_desk/ford-malloa/550e8400-e29b-41d4-a716-446655440000
//
// Si todavía no hay sistemas configurados ni headers del gateway,
// el systemFolder cae en el fallback "default-system" y queda:
//   dealer_desk/default-system/550e8400-e29b-41d4-a716-446655440000
//
// Esto deja todo listo para cuando existan múltiples dealers,
// sin romper nada mientras tanto.
//
// Se usa en product-image.service.js al subir imágenes.
// ============================================================================

// Limpia un string para que sea seguro como nombre de carpeta en Cloudinary.
// - Quita espacios, acentos, caracteres especiales
// - Convierte a minúsculas
// - Reemplaza todo lo que no sea letra/número/guion/underscore por guiones
// - Si el valor está vacío o no es string, devuelve el fallback
//
// Ejemplo: "Ford Malloa!" → "ford-malloa"
function normalizeFolderSegment(value, fallback) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')                       // Descompone acentos: "é" → "e" + acento
    .replace(/[\u0300-\u036f]/g, '')        // Elimina los acentos sueltos
    .replace(/[^a-z0-9_-]+/g, '-')         // Todo lo que no sea alfanumérico → guion
    .replace(/-+/g, '-')                    // Colapsa guiones repetidos: "a---b" → "a-b"
    .replace(/^-|-$/g, '') || fallback;     // Quita guiones al inicio/final
}

// Resuelve el nombre de carpeta del sistema/dealer en Cloudinary.
//
// ¿Qué es un "slug"?
//   Un slug es una versión limpia de un nombre, pensada para URLs o carpetas.
//   Ejemplo: el nombre "Ford Malloa Motors" tendría como slug "ford-malloa-motors".
//   Sin espacios, sin acentos, sin caracteres raros. Solo letras, números y guiones.
//
// Prioridad de resolución (usa el primero que encuentre):
//   1. systemSlug  → slug del sistema (viene como header x-system-slug del gateway)
//   2. systemName  → nombre del sistema (header x-system-name)
//   3. tenantSlug  → slug del tenant (header x-tenant-slug)
//   4. tenantName  → nombre del tenant (header x-tenant-name)
//   5. DEFAULT_SYSTEM_FOLDER → variable de entorno (.env)
//   6. 'default-system' → fallback final si no hay nada
//
// Hoy, como todavía no hay módulo de sistemas ni gateway enviando headers,
// siempre cae al fallback "default-system". Eso está bien — cuando se
// implementen los sistemas, el gateway empezará a enviar esos headers
// y la carpeta se resolverá automáticamente sin tocar este código.
function resolveSystemFolderName(context = {}) {
  return normalizeFolderSegment(
    context.systemSlug
      || context.systemName
      || context.tenantSlug
      || context.tenantName
      || process.env.DEFAULT_SYSTEM_FOLDER,
    'default-system',
  );
}

// Construye la ruta de carpeta en Cloudinary para las imágenes de un producto.
// Recibe un objeto context con al menos { productId } y opcionalmente datos del sistema.
//
// Ejemplo sin sistema: "dealer_desk/default-system/550e8400-..."
// Ejemplo con sistema: "dealer_desk/ford-malloa/550e8400-..."
function buildProductImagesFolder(context = {}) {
  const systemFolder = resolveSystemFolderName(context);
  const productId = normalizeFolderSegment(context.productId, 'unknown-product');

  return `dealer_desk/${systemFolder}/${productId}`;
}

export { buildProductImagesFolder, normalizeFolderSegment, resolveSystemFolderName };
