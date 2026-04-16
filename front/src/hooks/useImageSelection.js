import { useEffect, useState } from 'react';
import { IMAGE_RULES } from '@/lib/config';

export function useImageSelection() {
  const [files, setFiles] = useState([]);
  const [notice, setNotice] = useState('');
  const [previewItems, setPreviewItems] = useState([]);

  useEffect(() => {
    // Cada preview usa URL.createObjectURL(...).
    // Si no limpiamos esas URLs temporales, el navegador puede retener memoria
    // aunque el usuario ya haya cambiado las imagenes seleccionadas.
    return () => {
      previewItems.forEach((item) => {
        URL.revokeObjectURL(item.url);
      });
    };
  }, [previewItems]);

  function handleFilesSelected(fileList) {
    const incomingFiles = Array.from(fileList || []);
    const nextErrors = [];
    const nextValidFiles = [];
    const limitedFiles = incomingFiles.slice(0, IMAGE_RULES.maxCount);

    if (incomingFiles.length > IMAGE_RULES.maxCount) {
      nextErrors.push(`Solo se tomaran las primeras ${IMAGE_RULES.maxCount} imagenes.`);
    }

    limitedFiles.forEach((file) => {
      // Validamos en el front para dar feedback rapido.
      // Igual el backend debe volver a validar porque el navegador no es una frontera de seguridad.
      if (!IMAGE_RULES.acceptedTypes.includes(file.type)) {
        nextErrors.push(`${file.name}: solo JPEG, PNG o WEBP.`);
        return;
      }

      if (file.size > IMAGE_RULES.maxSizeBytes) {
        nextErrors.push(`${file.name}: supera los 5 MB.`);
        return;
      }

      nextValidFiles.push(file);
    });

    setFiles(nextValidFiles);
    setNotice(nextErrors.join(' '));
    setPreviewItems(
      nextValidFiles.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      })),
    );
  }

  function clearSelection() {
    setFiles([]);
    setNotice('');
    setPreviewItems([]);
  }

  return {
    clearSelection,
    files,
    handleFilesSelected,
    hasFiles: files.length > 0,
    notice,
    previewItems,
  };
}
