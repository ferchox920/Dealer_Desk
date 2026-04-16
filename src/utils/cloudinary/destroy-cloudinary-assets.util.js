import cloudinary from '../../config/cloudinary/cloudinary.js';

// Borra assets en paralelo y registra fallas sin romper el flujo principal.
// Para operaciones donde la DB ya confirmo cambios, es preferible dejar
// basura recuperable en Cloudinary antes que dejar referencias rotas en la DB.
async function destroyCloudinaryAssetsBestEffort(publicIds = [], contextLabel = 'asset') {
  if (!Array.isArray(publicIds) || publicIds.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    publicIds.map((publicId) => cloudinary.uploader.destroy(publicId)),
  );

  const failedPublicIds = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      return;
    }

    const failedPublicId = publicIds[index];
    failedPublicIds.push(failedPublicId);

    console.error(
      `[cloudinary:cleanup] Failed to destroy ${contextLabel} "${failedPublicId}": ${result.reason?.message || result.reason}`,
    );
  });

  return failedPublicIds;
}

export { destroyCloudinaryAssetsBestEffort };
