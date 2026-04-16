import { Card } from '@/components/ui/Card';
import { ProductImageManager } from '@/components/product/ProductImageManager';
import styles from '@/components/product/UploadedGallery.module.css';

export function UploadedGallery({
  images,
  isReordering = false,
  onReorderImages,
}) {
  if (images.length === 0) {
    return null;
  }

  return (
    <Card className={styles.gallery}>
      <div className={styles.copy}>
        <div className={styles.header}>
          <strong className={styles.title}>Imagenes cargadas en esta sesion</strong>
          <span className="muted-text">La primera queda como portada</span>
        </div>
        <p className={styles.description}>
          Aqui tambien puedes arrastrar para ordenar la galeria antes de salir de la pantalla.
        </p>
      </div>

      <ProductImageManager
        images={images}
        isReordering={isReordering}
        onReorderImages={onReorderImages}
        showInstructions={false}
      />
    </Card>
  );
}
