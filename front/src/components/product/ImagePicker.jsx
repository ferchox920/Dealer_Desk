import { useDropzone } from 'react-dropzone';
import { IMAGE_RULES } from '@/lib/config';
import styles from '@/components/product/ImagePicker.module.css';

export function ImagePicker({ disabled, onFilesSelected }) {
  const {
    getInputProps,
    getRootProps,
    isDragAccept,
    isDragActive,
    isDragReject,
  } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    disabled,
    maxFiles: IMAGE_RULES.maxCount,
    maxSize: IMAGE_RULES.maxSizeBytes,
    multiple: true,
    onDrop: (acceptedFiles, fileRejections) => {
      const rejectedFiles = fileRejections.map(({ file }) => file);
      onFilesSelected([...acceptedFiles, ...rejectedFiles]);
    },
  });

  const dropzoneClassName = [
    styles.dropzone,
    isDragActive ? styles['dropzone--active'] : '',
    isDragAccept ? styles['dropzone--accept'] : '',
    isDragReject ? styles['dropzone--reject'] : '',
    disabled ? styles['dropzone--disabled'] : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label className={styles.label}>Imagenes</label>
        <span className={styles.helper}>Hasta {IMAGE_RULES.maxCount} archivos de 5 MB</span>
      </div>

      <div {...getRootProps({ className: dropzoneClassName })}>
        <input {...getInputProps()} />
        <div className={styles.copy}>
          <strong>Arrastra fotos aqui o haz clic para seleccionarlas</strong>
          <p>Solo JPEG, PNG o WEBP.</p>
          <p>La primera imagen sera la portada.</p>
          <p>Para cambiar la portada, arrastra la imagen al primer lugar.</p>
        </div>
      </div>
    </div>
  );
}
