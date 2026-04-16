import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_ROLES, APP_ROUTES, INVENTORY_VIEWS } from '@/lib/config';
import { listProductsRequest } from '@/services/products.service';
import { formatDateTime, formatNumber, formatProductPrice } from '@/utils/formatters';
import {
  buildProductDisplayName,
  getProductState,
  getWebsiteVisibilityLabel,
  hasProductImages,
  isProductActive,
  isProductInactive,
  isProductPublished,
  isProductSold,
} from '@/utils/product-status';
import styles from '@/pages/DashboardPage/DashboardPage.module.css';

function buildInventoryPath(view) {
  if (!view || view === INVENTORY_VIEWS.all) {
    return APP_ROUTES.inventory;
  }

  return `${APP_ROUTES.inventory}?view=${view}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { admin, withFreshAccess } = useAuth();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const isOwner = admin?.role === ADMIN_ROLES.owner;

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const productsResponse = await withFreshAccess((accessToken) => listProductsRequest(accessToken));

        if (!cancelled) {
          setProducts(productsResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error?.message || 'No pudimos cargar el resumen del panel.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [withFreshAccess]);

  const dashboardStats = useMemo(() => {
    const activeProducts = products.filter((product) => isProductActive(product)).length;
    const publishedProducts = products.filter((product) => isProductPublished(product)).length;
    const soldProducts = products.filter((product) => isProductSold(product)).length;
    const inactiveProducts = products.filter((product) => isProductInactive(product)).length;
    const productsWithoutImages = products.filter((product) => !hasProductImages(product)).length;

    return [
      {
        label: 'Activos',
        value: formatNumber(activeProducts),
        tone: 'primary',
        hint: 'Visibles solo dentro del sistema y listos para gestionarse.',
        view: INVENTORY_VIEWS.active,
      },
      {
        label: 'Publicados',
        value: formatNumber(publishedProducts),
        tone: 'success',
        hint: 'Listos para mostrarse en tu sitio.',
        view: INVENTORY_VIEWS.published,
      },
      {
        label: 'Vendidos',
        value: formatNumber(soldProducts),
        tone: 'danger',
        hint: 'Pueden seguir publicados en web con su franja de venta.',
        view: INVENTORY_VIEWS.sold,
      },
      {
        label: 'Sin imagenes',
        value: formatNumber(productsWithoutImages),
        tone: 'neutral',
        hint: 'Productos que aun necesitan fotos.',
        view: INVENTORY_VIEWS.withoutImages,
      },
      {
        label: 'Inactivos',
        value: formatNumber(inactiveProducts),
        tone: 'neutral',
        hint: 'Productos pausados y fuera de circulacion.',
        view: INVENTORY_VIEWS.inactive,
      },
    ];
  }, [products]);

  const recentProducts = useMemo(() => {
    return [...products]
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
      .slice(0, 5);
  }, [products]);

  return (
    <div className={styles.page}>
      <PageHeader
        actions={(
          <div className={styles.headerActions}>
            <Button onClick={() => navigate(APP_ROUTES.inventoryNew)}>Nuevo producto</Button>
            <Button onClick={() => navigate(APP_ROUTES.inventory)} variant="secondary">
              Abrir inventario
            </Button>
          </div>
        )}
        eyebrow="Panel principal"
        subtitle="Consulta lo importante de tu inventario y entra directo a las tareas que mantienen tus productos listos para vender."
        title="Resumen de tu inventario"
      />

      {errorMessage ? (
        <Alert
          type="error"
          title="No pudimos cargar el dashboard"
          message={errorMessage}
        />
      ) : null}

      <section className={styles.metricsGrid} aria-label="Metricas del dashboard">
        {dashboardStats.map((stat) => (
          <Card
            as="button"
            className={[styles.metricCard, styles.metricCardButton].join(' ')}
            key={stat.label}
            type="button"
            onClick={() => navigate(buildInventoryPath(stat.view))}
          >
            <StatusBadge tone={stat.tone}>{stat.label}</StatusBadge>
            <strong className={styles.metricValue}>{stat.value}</strong>
            <span className={styles.metricHint}>{stat.hint}</span>
          </Card>
        ))}
      </section>

      <section className={styles.contentGrid}>
        <Card className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className="page-eyebrow">Gestion rapida</p>
              <h2 className="section-title">Lo que puedes hacer ahora</h2>
            </div>
            <p className="muted-text">
              Entra directo a las tareas que mueven tu inventario sin dar vueltas.
            </p>
          </div>

          <div className={styles.quickActions}>
            <button className={styles.quickAction} onClick={() => navigate(APP_ROUTES.inventoryNew)} type="button">
              <strong>Nuevo producto</strong>
              <span>Crea una nueva ficha y deja su informacion lista para trabajar.</span>
            </button>

            <button className={styles.quickAction} onClick={() => navigate(APP_ROUTES.inventory)} type="button">
              <strong>Inventario completo</strong>
              <span>Consulta todos tus productos y entra rapido a editarlos.</span>
            </button>

            <button
              className={styles.quickAction}
              onClick={() => navigate(buildInventoryPath(INVENTORY_VIEWS.withoutImages))}
              type="button"
            >
              <strong>Cargar imagenes</strong>
              <span>Ve directo a los productos que aun necesitan fotos.</span>
            </button>

            {isOwner ? (
              <button className={styles.quickAction} onClick={() => navigate(APP_ROUTES.users)} type="button">
                <strong>Usuarios y permisos</strong>
                <span>Administra quienes pueden entrar al panel y con que rol.</span>
              </button>
            ) : null}
          </div>
        </Card>

        <Card className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className="page-eyebrow">Recientes</p>
              <h2 className="section-title">Ultimos productos cargados</h2>
            </div>
            <Button
              onClick={() => navigate(buildInventoryPath(INVENTORY_VIEWS.recent))}
              variant="secondary"
            >
              Ver listado
            </Button>
          </div>

          {isLoading ? (
            <Loader label="Cargando productos recientes..." />
          ) : recentProducts.length === 0 ? (
            <div className={styles.emptyState}>Todavia no hay productos creados en el sistema.</div>
          ) : (
            <div className={styles.recentList}>
              {recentProducts.map((product) => {
                const productState = getProductState(product);

                return (
                  <button
                    className={styles.recentRow}
                    key={product.id}
                    type="button"
                    onClick={() => navigate(APP_ROUTES.inventoryEdit(product.id))}
                  >
                    <div>
                      <strong className={styles.recentTitle}>{buildProductDisplayName(product)}</strong>
                      <p className={styles.recentMeta}>
                        Codigo {product.internal_code} | VIN {product.vin_number} | {formatDateTime(product.created_at)}
                      </p>
                    </div>

                    <div className={styles.recentAside}>
                      <div className={styles.recentBadges}>
                        <StatusBadge tone={productState.tone}>
                          {productState.label}
                        </StatusBadge>
                        <StatusBadge tone="neutral">
                          {getWebsiteVisibilityLabel(product)}
                        </StatusBadge>
                      </div>
                      <strong>{formatProductPrice(product.price, product.currency_code)}</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
