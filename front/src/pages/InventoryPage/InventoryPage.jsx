import Fuse from 'fuse.js';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { APP_ROUTES, INVENTORY_VIEWS } from '@/lib/config';
import { deleteProductRequest, listProductsRequest } from '@/services/products.service';
import { formatDateTime, formatNumber, formatProductPrice } from '@/utils/formatters';
import {
  buildProductDisplayName,
  canDeleteProduct,
  getCommercialCondition,
  getProductState,
  getWebsiteVisibilityLabel,
  hasProductImages,
  isProductActive,
  isProductInactive,
  isProductPublished,
  isProductSold,
} from '@/utils/product-status';
import styles from '@/pages/InventoryPage/InventoryPage.module.css';

const INVENTORY_VIEW_META = {
  [INVENTORY_VIEWS.all]: {
    chipLabel: 'Todos',
    description: 'Explora todo tu inventario y entra a cualquier ficha para actualizarla.',
    emptyMessage: 'Aun no hay productos cargados.',
    eyebrow: 'Listado completo',
    title: 'Productos cargados',
  },
  [INVENTORY_VIEWS.active]: {
    chipLabel: 'Activos',
    description: 'Estos productos estan cargados en el sistema y listos para decidir su siguiente paso.',
    emptyMessage: 'No hay productos activos en este momento.',
    eyebrow: 'Activos',
    title: 'Productos activos',
  },
  [INVENTORY_VIEWS.published]: {
    chipLabel: 'Publicados',
    description: 'Consulta lo que ya esta listo para mostrarse en tu sitio.',
    emptyMessage: 'Todavia no tienes productos publicados.',
    eyebrow: 'Publicados',
    title: 'Productos publicados',
  },
  [INVENTORY_VIEWS.sold]: {
    chipLabel: 'Vendidos',
    description: 'Valida los productos que ya deben verse como vendidos.',
    emptyMessage: 'No hay productos vendidos por ahora.',
    eyebrow: 'Venta cerrada',
    title: 'Productos vendidos',
  },
  [INVENTORY_VIEWS.inactive]: {
    chipLabel: 'Inactivos',
    description: 'Estos productos fueron pausados y desde aqui puedes revisar si deben volver o eliminarse.',
    emptyMessage: 'No hay productos inactivos por ahora.',
    eyebrow: 'Inactivos',
    title: 'Productos inactivos',
  },
  [INVENTORY_VIEWS.withoutImages]: {
    chipLabel: 'Sin imagenes',
    description: 'Completa las fichas que aun necesitan fotos.',
    emptyMessage: 'Todos tus productos ya tienen al menos una imagen.',
    eyebrow: 'Pendientes visuales',
    title: 'Productos sin imagenes',
  },
  [INVENTORY_VIEWS.recent]: {
    chipLabel: 'Recientes',
    description: 'Estos son los ultimos productos cargados en el sistema.',
    emptyMessage: 'Todavia no hay productos recientes para mostrar.',
    eyebrow: 'Recientes',
    title: 'Ultimos productos cargados',
  },
};

function normalizeInventoryView(view) {
  if (view && INVENTORY_VIEW_META[view]) {
    return view;
  }

  return INVENTORY_VIEWS.all;
}

function buildSearchableProducts(products) {
  return products.map((product) => ({
    ...product,
    year_search: String(product.year || ''),
  }));
}

export function InventoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { withFreshAccess } = useAuth();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionAlert, setActionAlert] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const currentView = normalizeInventoryView(searchParams.get('view'));
  const currentSearchQuery = searchParams.get('q') || '';
  const deferredSearchQuery = useDeferredValue(currentSearchQuery.trim());

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const productsResponse = await withFreshAccess((accessToken) => listProductsRequest(accessToken));

        if (!cancelled) {
          setProducts(productsResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error?.message || 'No pudimos cargar el inventario.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [withFreshAccess]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
  }, [products]);

  const productsByView = useMemo(() => {
    switch (currentView) {
      case INVENTORY_VIEWS.active:
        return sortedProducts.filter((product) => isProductActive(product));
      case INVENTORY_VIEWS.published:
        return sortedProducts.filter((product) => isProductPublished(product));
      case INVENTORY_VIEWS.sold:
        return sortedProducts.filter((product) => isProductSold(product));
      case INVENTORY_VIEWS.inactive:
        return sortedProducts.filter((product) => isProductInactive(product));
      case INVENTORY_VIEWS.withoutImages:
        return sortedProducts.filter((product) => !hasProductImages(product));
      case INVENTORY_VIEWS.recent:
        return sortedProducts.slice(0, 5);
      default:
        return sortedProducts;
    }
  }, [currentView, sortedProducts]);

  const visibleProducts = useMemo(() => {
    if (!deferredSearchQuery) {
      return productsByView;
    }

    const searchableProducts = buildSearchableProducts(productsByView);
    const fuse = new Fuse(searchableProducts, {
      ignoreLocation: true,
      keys: [
        { name: 'internal_code', weight: 5 },
        { name: 'vin_number', weight: 4.5 },
        { name: 'brand', weight: 3.5 },
        { name: 'model', weight: 3.5 },
        { name: 'year_search', weight: 3 },
        { name: 'description', weight: 1.2 },
      ],
      threshold: 0.28,
    });

    return fuse.search(deferredSearchQuery).map((result) => result.item);
  }, [deferredSearchQuery, productsByView]);

  const summary = useMemo(() => {
    return {
      active: products.filter((product) => isProductActive(product)).length,
      published: products.filter((product) => isProductPublished(product)).length,
      sold: products.filter((product) => isProductSold(product)).length,
      inactive: products.filter((product) => isProductInactive(product)).length,
      withoutImages: products.filter((product) => !hasProductImages(product)).length,
    };
  }, [products]);

  const activeView = INVENTORY_VIEW_META[currentView];
  const resultsLabel = deferredSearchQuery
    ? `${formatNumber(visibleProducts.length)} resultado(s) para "${deferredSearchQuery}"`
    : `${formatNumber(visibleProducts.length)} producto(s) en esta vista`;

  function updateInventoryParams({ nextQuery = currentSearchQuery, nextView = currentView } = {}) {
    const params = new URLSearchParams();

    if (nextView && nextView !== INVENTORY_VIEWS.all) {
      params.set('view', nextView);
    }

    if (nextQuery.trim()) {
      params.set('q', nextQuery.trim());
    }

    setSearchParams(params);
  }

  function handleViewChange(view) {
    updateInventoryParams({
      nextQuery: currentSearchQuery,
      nextView: view,
    });
  }

  function handleSearchChange(event) {
    updateInventoryParams({
      nextQuery: event.target.value,
      nextView: currentView,
    });
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(`Vas a eliminar ${product.year} ${product.brand} ${product.model}. Esta accion tambien borra sus imagenes.`);

    if (!confirmed) {
      return;
    }

    try {
      setPendingDeleteId(product.id);
      await withFreshAccess((accessToken) => deleteProductRequest(product.id, accessToken));
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setActionAlert({
        type: 'success',
        title: 'Producto eliminado',
        message: `${product.brand} ${product.model} ya no existe en el inventario.`,
      });
    } catch (error) {
      setActionAlert({
        type: 'error',
        title: 'No pudimos eliminar el producto',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    } finally {
      setPendingDeleteId('');
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        actions={(
          <Button onClick={() => navigate(APP_ROUTES.inventoryNew)}>
            Nuevo producto
          </Button>
        )}
        eyebrow="Inventario"
        subtitle="Busca por codigo interno, VIN, marca, modelo o ano para entrar mas rapido a la ficha correcta."
        title="Listado de productos"
      />

      <Alert {...(actionAlert || {})} />

      {errorMessage ? (
        <Alert
          type="error"
          title="No pudimos cargar el inventario"
          message={errorMessage}
        />
      ) : null}

      <section className={styles.summaryRow}>
        <Card className={styles.summaryCard}>
          <span>Activos</span>
          <strong>{formatNumber(summary.active)}</strong>
        </Card>
        <Card className={styles.summaryCard}>
          <span>Publicados</span>
          <strong>{formatNumber(summary.published)}</strong>
        </Card>
        <Card className={styles.summaryCard}>
          <span>Vendidos</span>
          <strong>{formatNumber(summary.sold)}</strong>
        </Card>
        <Card className={styles.summaryCard}>
          <span>Inactivos</span>
          <strong>{formatNumber(summary.inactive)}</strong>
        </Card>
        <Card className={styles.summaryCard}>
          <span>Sin imagenes</span>
          <strong>{formatNumber(summary.withoutImages)}</strong>
        </Card>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.searchField}>
          <label className={styles.searchLabel} htmlFor="inventory-search">
            Buscador
          </label>
          <input
            id="inventory-search"
            name="inventory-search"
            type="search"
            placeholder="Codigo, VIN, marca, modelo o ano"
            value={currentSearchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className={styles.resultMeta}>
          <strong>{resultsLabel}</strong>
          {currentSearchQuery ? (
            <Button onClick={() => updateInventoryParams({ nextQuery: '', nextView: currentView })} variant="secondary">
              Limpiar busqueda
            </Button>
          ) : null}
        </div>
      </section>

      <section className={styles.filterBar} aria-label="Filtros del inventario">
        {Object.entries(INVENTORY_VIEW_META).map(([view, meta]) => (
          <button
            className={[
              styles.filterChip,
              currentView === view ? styles['filterChip--active'] : '',
            ].filter(Boolean).join(' ')}
            key={view}
            type="button"
            onClick={() => handleViewChange(view)}
          >
            {meta.chipLabel}
          </button>
        ))}
      </section>

      <Card className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className="page-eyebrow">{activeView.eyebrow}</p>
            <h2 className="section-title">{activeView.title}</h2>
            <p className={styles.panelDescription}>{activeView.description}</p>
          </div>
          {currentView !== INVENTORY_VIEWS.all ? (
            <Button onClick={() => handleViewChange(INVENTORY_VIEWS.all)} variant="secondary">
              Ver todo
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <Loader label="Cargando productos..." />
        ) : visibleProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              {deferredSearchQuery
                ? `No encontramos coincidencias para "${deferredSearchQuery}" dentro de esta vista.`
                : activeView.emptyMessage}
            </p>
            {currentSearchQuery ? (
              <Button onClick={() => updateInventoryParams({ nextQuery: '', nextView: currentView })} variant="secondary">
                Limpiar busqueda
              </Button>
            ) : currentView === INVENTORY_VIEWS.all ? (
              <Button onClick={() => navigate(APP_ROUTES.inventoryNew)}>
                Crear el primer producto
              </Button>
            ) : (
              <Button onClick={() => handleViewChange(INVENTORY_VIEWS.all)} variant="secondary">
                Ver todo el inventario
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.inventoryList}>
            {visibleProducts.map((product) => {
              const coverImage = product.images?.[0];
              const productState = getProductState(product);
              const commercialCondition = getCommercialCondition(product);

              return (
                <article className={styles.inventoryRow} key={product.id}>
                  <div className={styles.visual}>
                    {coverImage ? (
                      <img
                        alt={`${product.brand} ${product.model}`}
                        className={styles.visualImage}
                        src={coverImage.url}
                      />
                    ) : (
                      <div className={styles.visualPlaceholder}>Sin portada</div>
                    )}
                  </div>

                  <div className={styles.mainInfo}>
                    <div className={styles.mainHeader}>
                      <div>
                        <p className={styles.codeLine}>Codigo {product.internal_code}</p>
                        <strong className={styles.productName}>{buildProductDisplayName(product)}</strong>
                        <p className={styles.metaLine}>
                          VIN {product.vin_number} | {formatDateTime(product.created_at)}
                        </p>
                      </div>

                      <div className={styles.badges}>
                        <StatusBadge tone={productState.tone}>
                          {productState.label}
                        </StatusBadge>
                        <StatusBadge tone={commercialCondition.tone}>
                          {commercialCondition.label}
                        </StatusBadge>
                      </div>
                    </div>

                    <div className={styles.detailsGrid}>
                      <div className={styles.detailItem}>
                        <span>Precio</span>
                        <strong>{formatProductPrice(product.price, product.currency_code)}</strong>
                      </div>
                      <div className={styles.detailItem}>
                        <span>Publicacion</span>
                        <strong>{getWebsiteVisibilityLabel(product)}</strong>
                      </div>
                      <div className={styles.detailItem}>
                        <span>Kilometraje</span>
                        <strong>{formatNumber(product.mileage)}</strong>
                      </div>
                      <div className={styles.detailItem}>
                        <span>Traccion</span>
                        <strong>{product.drive_train}</strong>
                      </div>
                      <div className={styles.detailItem}>
                        <span>Combustible</span>
                        <strong>{product.fuel_type}</strong>
                      </div>
                    </div>

                    <div className={styles.actionsRow}>
                      <Button
                        className={styles.rowButton}
                        onClick={() => navigate(APP_ROUTES.inventoryEdit(product.id))}
                        variant="secondary"
                      >
                        Editar producto
                      </Button>
                      <Button
                        className={styles.rowButton}
                        isLoading={pendingDeleteId === product.id}
                        disabled={!canDeleteProduct(product)}
                        onClick={() => handleDelete(product)}
                        title={canDeleteProduct(product) ? 'Eliminar producto' : 'Primero inactiva el producto para poder eliminarlo'}
                        variant="danger"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
