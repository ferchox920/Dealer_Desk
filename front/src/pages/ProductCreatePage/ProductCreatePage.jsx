import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ImagePicker } from '@/components/product/ImagePicker';
import { PreviewGrid } from '@/components/product/PreviewGrid';
import { ProductForm } from '@/components/product/ProductForm';
import { ProductSummaryCard } from '@/components/product/ProductSummaryCard';
import { UploadedGallery } from '@/components/product/UploadedGallery';
import { useAuth } from '@/hooks/useAuth';
import { useImageSelection } from '@/hooks/useImageSelection';
import { APP_ROUTES } from '@/lib/config';
import { createProductRequest } from '@/services/products.service';
import {
  reorderProductImagesRequest,
  uploadProductImagesRequest,
} from '@/services/product-images.service';
import { extractApiFieldErrors, validateProductForm } from '@/utils/validation';
import styles from '@/pages/ProductCreatePage/ProductCreatePage.module.css';

const initialValues = {
  year: '',
  brand: '',
  model: '',
  mileage: '',
  price: '',
  currency_code: 'USD',
  drive_train: '',
  fuel_type: '',
  vin_number: '',
  description: '',
};

export function ProductCreatePage() {
  const navigate = useNavigate();
  const { withFreshAccess } = useAuth();
  const { clearSelection, files, handleFilesSelected, hasFiles, notice, previewItems } = useImageSelection();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [product, setProduct] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [productAlert, setProductAlert] = useState(null);
  const [imagesAlert, setImagesAlert] = useState(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isReorderingImages, setIsReorderingImages] = useState(false);

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
      setProductAlert({
        type: 'error',
        title: 'Revisa los campos',
        message: 'Corrige los campos marcados antes de crear el producto.',
      });
      return;
    }

    try {
      setIsSubmittingProduct(true);
      setProductAlert(null);

      // Seguimos el contrato real del backend:
      // primero se crea el producto con datos JSON,
      // y despues se suben imagenes usando el id que devolvio la API.
      const payload = {
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

      const createdProduct = await withFreshAccess((accessToken) =>
        createProductRequest(payload, accessToken),
      );

      setProduct(createdProduct);
      setUploadedImages([]);
      clearSelection();
      setImagesAlert(null);

      setProductAlert({
        type: 'success',
        title: 'Producto creado',
        message: `Producto listo. Codigo ${createdProduct.internal_code}. Ahora ya puedes subir imagenes.`,
      });
    } catch (error) {
      const apiFieldErrors = extractApiFieldErrors(error);

      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors(apiFieldErrors);
      }

      setProductAlert({
        type: 'error',
        title: 'No pudimos crear el producto',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    } finally {
      setIsSubmittingProduct(false);
    }
  }

  async function handleImagesSubmit(event) {
    event.preventDefault();

    if (!product) {
      setImagesAlert({
        type: 'error',
        title: 'Primero crea el producto',
        message: 'La API de imagenes necesita un productId real antes de subir archivos.',
      });
      return;
    }

    if (!hasFiles) {
      setImagesAlert({
        type: 'error',
        title: 'No hay imagenes seleccionadas',
        message: 'Selecciona al menos una imagen valida antes de subir.',
      });
      return;
    }

    try {
      setIsUploadingImages(true);

      // Esta segunda llamada ya trabaja con multipart/form-data.
      // Por eso vive aparte del submit principal y depende del product.id.
      const newImages = await withFreshAccess((accessToken) =>
        uploadProductImagesRequest(product.id, files, accessToken),
      );

      setUploadedImages((current) => [...current, ...newImages]);
      clearSelection();

      setImagesAlert({
        type: 'success',
        title: 'Imagenes subidas',
        message: `Subimos ${newImages.length} imagen(es). Si quieres, puedes reordenarlas ahora mismo o volver a cargar mas archivos.`,
      });
    } catch (error) {
      setImagesAlert({
        type: 'error',
        title: 'No pudimos subir las imagenes',
        message: error?.message || 'El producto ya existe, asi que puedes corregir y reintentar.',
      });
    } finally {
      setIsUploadingImages(false);
    }
  }

  async function handleReorderImages(orderedImageIds) {
    if (!product) {
      return;
    }

    const previousImages = uploadedImages;

    try {
      setIsReorderingImages(true);
      setImagesAlert(null);

      const reorderedImages = await withFreshAccess((accessToken) =>
        reorderProductImagesRequest(product.id, orderedImageIds, accessToken),
      );

      setUploadedImages(reorderedImages);
      setImagesAlert({
        type: 'success',
        title: 'Galeria actualizada',
        message: 'El nuevo orden ya quedo guardado y la primera imagen paso a ser la portada.',
      });
    } catch (error) {
      setUploadedImages(previousImages.map((image) => ({ ...image })));
      setImagesAlert({
        type: 'error',
        title: 'No pudimos guardar el nuevo orden',
        message: error?.message || 'La galeria volvio a su estado anterior para que no pierdas el contexto.',
      });
    } finally {
      setIsReorderingImages(false);
    }
  }

  const previewEmptyMessage = product
    ? 'Selecciona una o mas imagenes para ver el preview antes de subir.'
    : 'Crea el producto primero para habilitar la subida de imagenes.';

  return (
    <div className={styles.page}>
      <PageHeader
        actions={(
          <Button onClick={() => navigate(APP_ROUTES.inventory)} variant="secondary">
            Ver inventario
          </Button>
        )}
        eyebrow="Inventario"
        subtitle="Primero crea la ficha del producto y luego carga sus imagenes. El producto entra activo dentro del panel y despues decides si publicarlo o inactivarlo."
        title="Crear producto y cargar imagenes"
      />

      <div className={styles.contentGrid}>
        <div className={styles.primaryStack}>
          <Card>
            <div className={styles.sectionHeading}>
              <div>
                <p className="page-eyebrow">Paso 1</p>
                <h2 className="section-title">Datos del producto</h2>
              </div>
              <p className="muted-text">
                Aqui cargas la informacion base. El estado se gestiona despues con acciones claras, no con selectores manuales.
              </p>
            </div>

            <Alert {...(productAlert || {})} />
            <ProductForm
              errors={errors}
              isSubmitting={isSubmittingProduct}
              onChange={handleChange}
              onSubmit={handleProductSubmit}
              values={values}
            />
          </Card>
        </div>

        <aside className={styles.sidebar}>
          <ProductSummaryCard
            product={product}
            uploadedImagesCount={uploadedImages.length}
          />

          <Card>
            <div className={styles.sectionHeading}>
              <div>
                <p className="page-eyebrow">Paso 2</p>
                <h2 className="section-title">Subir imagenes</h2>
              </div>
              <p className="muted-text">Hasta 30 imagenes. Maximo 5 MB por archivo.</p>
            </div>

            <Alert {...(imagesAlert || {})} />
            {notice ? (
              <Alert
                type="error"
                title="Algunas imagenes no entraron"
                message={notice}
              />
            ) : null}

            <form className={styles.imagesForm} onSubmit={handleImagesSubmit} noValidate>
              <ImagePicker
                disabled={!product}
                onFilesSelected={handleFilesSelected}
              />

              <PreviewGrid emptyMessage={previewEmptyMessage} items={previewItems} />

              <Button isBlock isLoading={isUploadingImages} type="submit" disabled={!product || !hasFiles}>
                Subir imagenes
              </Button>
            </form>
          </Card>

          <UploadedGallery
            images={uploadedImages}
            isReordering={isReorderingImages}
            onReorderImages={handleReorderImages}
          />
        </aside>
      </div>
    </div>
  );
}
