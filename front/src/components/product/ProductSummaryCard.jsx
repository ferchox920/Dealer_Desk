import { Card } from '@/components/ui/Card';
import { formatDateTime, formatProductPrice } from '@/utils/formatters';
import {
  getCommercialCondition,
  getProductState,
  getWebsiteVisibilityLabel,
} from '@/utils/product-status';
import styles from '@/components/product/ProductSummaryCard.module.css';

export function ProductSummaryCard({ product, uploadedImagesCount }) {
  if (!product) {
    return (
      <Card>
        <div className={styles.header}>
          <div>
            <p className="page-eyebrow">Estado</p>
            <h2 className="section-title">Resumen actual</h2>
          </div>
        </div>

        <div className={styles.emptyState}>
          Todavia no creaste ningun producto en esta sesion.
        </div>
      </Card>
    );
  }

  const productState = getProductState(product);
  const commercialCondition = getCommercialCondition(product);
  const rows = [
    ['Codigo interno', product.internal_code || 'Sin codigo'],
    ['ID', product.id],
    ['Vehiculo', `${product.year} ${product.brand} ${product.model}`],
    ['VIN', product.vin_number],
    ['Precio', formatProductPrice(product.price, product.currency_code)],
    ['Estado', productState.label],
    ['Condicion', commercialCondition.label],
    ['Publicacion', getWebsiteVisibilityLabel(product)],
    ['Imagenes subidas', String(uploadedImagesCount)],
    ['Creado', formatDateTime(product.created_at)],
  ];

  return (
    <Card>
      <div className={styles.header}>
        <div>
          <p className="page-eyebrow">Estado</p>
          <h2 className="section-title">Resumen actual</h2>
        </div>
      </div>

      <div className={styles.stack}>
        {rows.map(([label, value]) => (
          <div className={styles.row} key={label}>
            <span className={styles.label}>{label}</span>
            <strong className={styles.value}>{value}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}
