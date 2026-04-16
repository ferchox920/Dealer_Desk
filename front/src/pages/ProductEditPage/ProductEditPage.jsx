import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { PageHeader } from '@/components/ui/PageHeader';
import { ImagePicker } from '@/components/product/ImagePicker';
import { PreviewGrid } from '@/components/product/PreviewGrid';
import { ProductForm } from '@/components/product/ProductForm';
import { ProductImageManager } from '@/components/product/ProductImageManager';
import { ProductSummaryCard } from '@/components/product/ProductSummaryCard';
import { useAuth } from '@/hooks/useAuth';
import { useImageSelection } from '@/hooks/useImageSelection';
import { APP_ROUTES } from '@/lib/config';
import {
  activateProductRequest,
  deleteProductRequest,
  getProductRequest,
  inactivateProductRequest,
  markProductAvailableRequest,
  markProductSoldRequest,
  publishProductRequest,
  unpublishProductRequest,
  updateProductRequest,
} from '@/services/products.service';
import {
  deleteProductImageRequest,
  reorderProductImagesRequest,
  uploadProductImagesRequest,
} from '@/services/product-images.service';
import { extractApiFieldErrors, validateProductForm } from '@/utils/validation';
import {
  canActivateProduct,
  canDeleteProduct,
  canInactivateProduct,
  canMarkAvailableProduct,
  canMarkSoldProduct,
  canPublishProduct,
  canUnpublishProduct,
  getCommercialCondition,
  getProductState,
  getWebsiteVisibilityLabel,
} from '@/utils/product-status';
import styles from '@/pages/ProductEditPage/ProductEditPage.module.css';

function productToFormValues(product) {
  return {
    year: String(product.year ?? ''),
    brand: product.brand ?? '',
    model: product.model ?? '',
    mileage: String(product.mileage ?? ''),
    price: String(product.price ?? ''),
    currency_code: product.currency_code ?? 'USD',
    drive_train: product.drive_train ?? '',
    fuel_type: product.fuel_type ?? '',
    vin_number: product.vin_number ?? '',
    description: product.description ?? '',
  };
}

function buildProductPayload(values) {
  return {
    year: Number.parseInt(values.year, 10),
    brand: values.brand.trim(),
    model: values.model.trim(),
    mileage: Number.parseInt(values.mileage, 10),
    price: Number.parseInt(values.price, 10),
    currency_code: values.currency_code,
    drive_train: values.drive_train.trim(),
    fuel_type: values.fuel_type.trim(),
    vin_number: values.vin_number.trim(),
    description: values.description.trim() || undefined,
  };
}

export function ProductEditPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { withFreshAccess } = useAuth();
  const { clearSelection, files, handleFilesSelected, hasFiles, notice, previewItems } = useImageSelection();
  const [product, setProduct] = useState(null);
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [pageAlert, setPageAlert] = useState(null);
  const [imagesAlert, setImagesAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isReorderingImages, setIsReorderingImages] = useState(false);
  const [pendingImageDeleteId, setPendingImageDeleteId] = useState('');
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  const loadProduct = useCallback(async ({ syncForm = true } = {}) => {
    try {
      setIsLoading(true);
      setPageAlert(null);

      const productResponse = await withFreshAccess((accessToken) =>
        getProductRequest(productId, accessToken),
      );

      setProduct(productResponse);
      setValues((current) => (syncForm || !current ? productToFormValues(productResponse) : current));
    } catch (error) {
      setPageAlert({
        type: 'error',
        title: 'No pudimos cargar el producto',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [productId, withFreshAccess]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const uploadedImagesCount = useMemo(() => product?.images?.length || 0, [product?.images]);

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((current) => ({
      ...current,
      [name]: value,
    }));
    setErrors((current) => ({
      ...current,
      [name]: '',
    }));
  }

  async function handleProductSubmit(event) {
    event.preventDefault();

    const validationErrors = validateProductForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setPageAlert({
        type: 'error',
        title: 'Revisa los campos',
        message: 'Corrige los errores antes de actualizar el producto.',
      });
      return;
    }

    try {
      setIsSavingProduct(true);
      setPageAlert(null);

      const updatedProduct = await withFreshAccess((accessToken) =>
        updateProductRequest(productId, buildProductPayload(values), accessToken),
      );

      setProduct((current) => ({
        ...current,
        ...updatedProduct,
      }));
      setValues(productToFormValues(updatedProduct));
      setPageAlert({
        type: 'success',
        title: 'Producto actualizado',
        message: 'Los cambios del producto ya quedaron guardados.',
      });
    } catch (error) {
      const apiFieldErrors = extractApiFieldErrors(error);

      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors(apiFieldErrors);
      }

      setPageAlert({
        type: 'error',
        title: 'No pudimos actualizar el producto',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    } finally {
      setIsSavingProduct(false);
    }
  }

  async function handleDeleteProduct() {
    const confirmed = window.confirm('Vas a eliminar este producto y todas sus imagenes. Esta accion no se puede deshacer.');

    if (!confirmed) {
      return;
    }

    try {
      setIsDeletingProduct(true);
      await withFreshAccess((accessToken) => deleteProductRequest(productId, accessToken));
      navigate(APP_ROUTES.inventory, { replace: true });
    } catch (error) {
      setPageAlert({
        type: 'error',
        title: 'No pudimos eliminar el producto',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    } finally {
      setIsDeletingProduct(false);
    }
  }

  async function handleStatusAction(actionKey) {
    const actionMap = {
      activate: {
        request: activateProductRequest,
        successMessage: 'El producto volvio a quedar activo dentro del sistema.',
        successTitle: 'Producto activado',
      },
      inactivate: {
        request: inactivateProductRequest,
        successMessage: 'El producto quedo inactivo y salio de la vista normal del inventario.',
        successTitle: 'Producto inactivado',
      },
      markAvailable: {
        request: markProductAvailableRequest,
        successMessage: 'El producto volvio a quedar disponible.',
        successTitle: 'Producto disponible',
      },
      markSold: {
        request: markProductSoldRequest,
        successMessage: 'El producto quedo marcado como vendido y puede seguir publicado en la web.',
        successTitle: 'Producto vendido',
      },
      publish: {
        request: publishProductRequest,
        successMessage: 'El producto ya quedo publicado para el sitio web.',
        successTitle: 'Producto publicado',
      },
      unpublish: {
        request: unpublishProductRequest,
        successMessage: 'El producto salio de la web y queda activo solo dentro del sistema.',
        successTitle: 'Producto despublicado',
      },
    };

    const action = actionMap[actionKey];

    if (!action) {
      return;
    }

    try {
      setPageAlert(null);
      const updatedProduct = await withFreshAccess((accessToken) =>
        action.request(productId, accessToken),
      );

      setProduct((current) => ({
        ...current,
        ...updatedProduct,
      }));
      setPageAlert({
        type: 'success',
        title: action.successTitle,
        message: action.successMessage,
      });
    } catch (error) {
      setPageAlert({
        type: 'error',
        title: 'No pudimos cambiar el estado del producto',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    }
  }

  async function handleImagesSubmit(event) {
    event.preventDefault();

    if (!hasFiles) {
      setImagesAlert({
        type: 'error',
        title: 'No hay imagenes seleccionadas',
        message: 'Selecciona al menos una imagen antes de subir.',
      });
      return;
    }

    try {
      setIsUploadingImages(true);
      setImagesAlert(null);
      await withFreshAccess((accessToken) =>
        uploadProductImagesRequest(productId, files, accessToken),
      );

      clearSelection();
      await loadProduct({ syncForm: false });
      setImagesAlert({
        type: 'success',
        title: 'Imagenes subidas',
        message: 'Las nuevas imagenes ya quedaron asociadas al producto.',
      });
    } catch (error) {
      setImagesAlert({
        type: 'error',
        title: 'No pudimos subir las imagenes',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    } finally {
      setIsUploadingImages(false);
    }
  }

  async function handleReorderImages(orderedImageIds) {
    try {
      setIsReorderingImages(true);
      setImagesAlert(null);

      const reorderedImages = await withFreshAccess((accessToken) =>
        reorderProductImagesRequest(productId, orderedImageIds, accessToken),
      );

      setProduct((current) => (current ? {
        ...current,
        images: reorderedImages,
      } : current));
      setImagesAlert({
        type: 'success',
        title: 'Galeria actualizada',
        message: 'El nuevo orden ya quedo guardado y la primera imagen es la portada.',
      });
    } catch (error) {
      await loadProduct({ syncForm: false });
      setImagesAlert({
        type: 'error',
        title: 'No pudimos guardar el nuevo orden',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    } finally {
      setIsReorderingImages(false);
    }
  }

  async function handleDeleteImage(image) {
    const confirmed = window.confirm('Vas a eliminar esta imagen del producto.');

    if (!confirmed) {
      return;
    }

    try {
      setPendingImageDeleteId(image.id);
      await withFreshAccess((accessToken) =>
        deleteProductImageRequest(productId, image.id, accessToken),
      );
      await loadProduct({ syncForm: false });
      setImagesAlert({
        type: 'success',
        title: 'Imagen eliminada',
        message: 'La galeria ya se actualizo y la portada se recalculo automaticamente.',
      });
    } catch (error) {
      setImagesAlert({
        type: 'error',
        title: 'No pudimos eliminar la imagen',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    } finally {
      setPendingImageDeleteId('');
    }
  }

  if (isLoading && !product) {
    return <Loader fullscreen label="Cargando producto..." />;
  }

  if (!values) {
    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="Inventario"
          subtitle="No pudimos abrir este producto."
          title="Editar producto"
        />
        <Alert {...(pageAlert || {
          type: 'error',
          title: 'Producto no disponible',
          message: 'No pudimos cargar el producto.',
        })} />
      </div>
    );
  }

  const productState = getProductState(product);
  const commercialCondition = getCommercialCondition(product);

  return (
    <div className={styles.page}>
      <PageHeader
        actions={(
          <div className={styles.headerActions}>
            <Button onClick={() => navigate(APP_ROUTES.inventory)} variant="secondary">
              Volver a inventario
            </Button>
            <Button
              disabled={!canDeleteProduct(product)}
              isLoading={isDeletingProduct}
              onClick={handleDeleteProduct}
              title={canDeleteProduct(product) ? 'Eliminar producto' : 'Primero inactiva el producto para poder eliminarlo'}
              variant="danger"
            >
              Eliminar producto
            </Button>
          </div>
        )}
        eyebrow="Inventario"
        subtitle="Actualiza la informacion del producto, mueve su publicacion con acciones claras y ordena la galeria con drag and drop."
        title="Editar producto"
      />

      <Alert {...(pageAlert || {})} />

      <div className={styles.contentGrid}>
        <div className={styles.primaryStack}>
          <Card>
            <div className={styles.sectionHeading}>
              <div>
                <p className="page-eyebrow">Producto</p>
                <h2 className="section-title">Datos principales</h2>
              </div>
              <p className="muted-text">
                Aqui solo editas los datos base. El estado se gestiona con acciones dedicadas.
              </p>
            </div>

            <ProductForm
              errors={errors}
              isSubmitting={isSavingProduct}
              onChange={handleChange}
              onSubmit={handleProductSubmit}
              submitLabel="Guardar producto"
              values={values}
            />
          </Card>

          <Card>
            <div className={styles.sectionHeading}>
              <div>
                <p className="page-eyebrow">Estado</p>
                <h2 className="section-title">Gestion del producto</h2>
              </div>
              <div className={styles.statusMeta}>
                <span className={styles.statusValue}>{productState.label}</span>
                <span className={styles.statusHint}>{getWebsiteVisibilityLabel(product)}</span>
              </div>
            </div>

            <div className={styles.statusActions}>
              {canPublishProduct(product) ? (
                <Button onClick={() => handleStatusAction('publish')}>
                  Publicar en web
                </Button>
              ) : null}

              {canUnpublishProduct(product) ? (
                <Button onClick={() => handleStatusAction('unpublish')} variant="secondary">
                  Despublicar de la web
                </Button>
              ) : null}

              {canActivateProduct(product) ? (
                <Button onClick={() => handleStatusAction('activate')} variant="secondary">
                  Activar en sistema
                </Button>
              ) : null}

              {canMarkSoldProduct(product) ? (
                <Button onClick={() => handleStatusAction('markSold')} variant="secondary">
                  Marcar vendido
                </Button>
              ) : null}

              {canMarkAvailableProduct(product) ? (
                <Button onClick={() => handleStatusAction('markAvailable')} variant="secondary">
                  Marcar disponible
                </Button>
              ) : null}

              {canInactivateProduct(product) ? (
                <Button onClick={() => handleStatusAction('inactivate')} variant="secondary">
                  Inactivar
                </Button>
              ) : null}
            </div>

            <div className={styles.statusCopy}>
              <p>
                `Activo` significa que el producto existe en el sistema y solo se ve dentro del panel.
              </p>
              <p>
                `Publicado` significa que ademas se muestra en la web. Si luego lo marcas como vendido, puede seguir publicado.
              </p>
              <p>
                `Inactivo` lo deja fuera de la vista normal y es el unico estado desde el que se permite eliminarlo.
              </p>
            </div>
          </Card>

          <Card>
            <div className={styles.sectionHeading}>
              <div>
                <p className="page-eyebrow">Galeria actual</p>
                <h2 className="section-title">Orden y portada</h2>
              </div>
              <p className="muted-text">La portada siempre es la primera imagen guardada.</p>
            </div>

            <Alert {...(imagesAlert || {})} />

            <ProductImageManager
              images={product.images || []}
              isReordering={isReorderingImages}
              onDeleteImage={handleDeleteImage}
              onReorderImages={handleReorderImages}
              pendingDeleteId={pendingImageDeleteId}
            />
          </Card>
        </div>

        <aside className={styles.sidebar}>
          <ProductSummaryCard product={product} uploadedImagesCount={uploadedImagesCount} />

          <Card>
            <div className={styles.sectionHeading}>
              <div>
                <p className="page-eyebrow">Lectura rapida</p>
                <h2 className="section-title">Como esta hoy</h2>
              </div>
            </div>

            <div className={styles.badgeStack}>
              <span className={styles.readingBadge}>{productState.label}</span>
              <span className={styles.readingBadgeMuted}>{commercialCondition.label}</span>
              <span className={styles.readingBadgeMuted}>{getWebsiteVisibilityLabel(product)}</span>
            </div>
          </Card>

          <Card>
            <div className={styles.sectionHeading}>
              <div>
                <p className="page-eyebrow">Nueva carga</p>
                <h2 className="section-title">Subir mas imagenes</h2>
              </div>
              <p className="muted-text">Las nuevas fotos se agregan al final de la galeria actual.</p>
            </div>

            {notice ? (
              <Alert
                type="error"
                title="Algunas imagenes no entraron"
                message={notice}
              />
            ) : null}

            <form className={styles.imagesForm} onSubmit={handleImagesSubmit} noValidate>
              <ImagePicker
                disabled={false}
                onFilesSelected={handleFilesSelected}
              />

              <PreviewGrid
                emptyMessage="Selecciona una o mas imagenes para ver el preview antes de subir."
                items={previewItems}
              />

              <Button isBlock isLoading={isUploadingImages} type="submit" disabled={!hasFiles}>
                Subir nuevas imagenes
              </Button>
            </form>
          </Card>
        </aside>
      </div>
    </div>
  );
}
