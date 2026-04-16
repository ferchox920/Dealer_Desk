import { useEffect, useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import styles from '@/components/product/ProductImageManager.module.css';

function buildOrderedImages(images, oldIndex, newIndex) {
  return arrayMove(images, oldIndex, newIndex).map((image, index) => ({
    ...image,
    is_cover: index === 0,
    sort_order: index,
  }));
}

function ProductImageCard({
  dragHandleProps = null,
  image,
  isDeletePending,
  isDragDisabled,
  isDragging = false,
  isOverlay = false,
  onDeleteImage,
}) {
  const showDeleteAction = typeof onDeleteImage === 'function';

  return (
    <article
      className={[
        styles.card,
        isDragging ? styles['card--dragging'] : '',
        isOverlay ? styles['card--overlay'] : '',
      ].filter(Boolean).join(' ')}
    >
      <img
        alt={`Imagen del producto ${image.id}`}
        className={styles.image}
        src={image.url}
      />

      <div className={styles.body}>
        <div className={styles.header}>
          <div className={styles.titleStack}>
            <strong className={styles.title}>
              {image.is_cover ? 'Portada actual' : `Imagen ${Number(image.sort_order) + 1}`}
            </strong>
            <span className={styles.meta}>Posicion {Number(image.sort_order) + 1}</span>
          </div>
          <StatusBadge tone={image.is_cover ? 'success' : 'neutral'}>
            {image.is_cover ? 'portada' : 'galeria'}
          </StatusBadge>
        </div>

        <p className={styles.description}>
          {image.is_cover
            ? 'Esta imagen se usa como portada porque esta en el primer lugar.'
            : 'Arrastrala si quieres subirla de posicion y convertirla en portada.'}
        </p>

        <div
          className={[
            styles.actions,
            !showDeleteAction ? styles['actions--single'] : '',
          ].filter(Boolean).join(' ')}
        >
          <button
            {...(dragHandleProps?.attributes || {})}
            {...(dragHandleProps?.listeners || {})}
            className={styles.handle}
            disabled={isDragDisabled}
            type="button"
          >
            Arrastrar
          </button>

          {showDeleteAction ? (
            <Button
              className={styles.actionButton}
              disabled={isDragDisabled}
              isLoading={isDeletePending}
              onClick={() => onDeleteImage(image)}
              type="button"
              variant="danger"
            >
              Eliminar imagen
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SortableImageCard({ image, isDeletePending, isDragDisabled, onDeleteImage }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    disabled: isDragDisabled,
    id: image.id,
  });

  const cardStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      className={styles.sortableItem}
      style={cardStyle}
    >
      <ProductImageCard
        dragHandleProps={{ attributes, listeners }}
        image={image}
        isDeletePending={isDeletePending}
        isDragDisabled={isDragDisabled}
        isDragging={isDragging}
        onDeleteImage={onDeleteImage}
      />
    </div>
  );
}

export function ProductImageManager({
  emptyMessage = 'Este producto todavia no tiene imagenes guardadas.',
  images,
  isReordering = false,
  onDeleteImage,
  onReorderImages,
  pendingDeleteId = '',
  showInstructions = true,
}) {
  const [orderedImages, setOrderedImages] = useState(images);
  const [activeImageId, setActiveImageId] = useState('');
  // Combinamos mouse, touch y teclado para que el mismo componente
  // funcione bien en desktop, mobile y escenarios mas accesibles.
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }), useSensor(TouchSensor, {
    activationConstraint: {
      delay: 140,
      tolerance: 10,
    },
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  }));
  const canReorder = typeof onReorderImages === 'function' && orderedImages.length > 1;
  const activeImage = useMemo(
    () => orderedImages.find((image) => image.id === activeImageId) ?? null,
    [activeImageId, orderedImages],
  );

  useEffect(() => {
    setOrderedImages(images);
    setActiveImageId('');
  }, [images]);

  if (images.length === 0) {
    return <div className={styles.emptyState}>{emptyMessage}</div>;
  }

  function handleDragStart(event) {
    setActiveImageId(String(event.active.id));
  }

  function handleDragCancel() {
    setActiveImageId('');
  }

  function handleDragEnd(event) {
    setActiveImageId('');

    if (!canReorder || isReordering) {
      return;
    }

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedImages.findIndex((image) => image.id === active.id);
    const newIndex = orderedImages.findIndex((image) => image.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextImages = buildOrderedImages(orderedImages, oldIndex, newIndex);

    setOrderedImages(nextImages);
    // El estado local se actualiza primero para que el drag se sienta inmediato.
    // Luego delegamos el guardado real al contenedor de la pagina.
    void onReorderImages(nextImages.map((image) => image.id));
  }

  return (
    <div className={styles.stack}>
      {showInstructions ? (
        <div className={styles.instructions}>
          <p>La primera imagen siempre sera la portada.</p>
          <p>Si quieres cambiarla, arrastra la foto deseada al primer lugar.</p>
        </div>
      ) : null}

      {isReordering ? (
        <div className={styles.reorderNotice}>Guardando el nuevo orden de la galeria...</div>
      ) : null}

      <DndContext
        collisionDetection={closestCenter}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <SortableContext
          items={orderedImages.map((image) => image.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.grid}>
            {orderedImages.map((image) => (
              <SortableImageCard
                image={image}
                isDeletePending={pendingDeleteId === image.id}
                isDragDisabled={!canReorder || isReordering || pendingDeleteId === image.id}
                key={image.id}
                onDeleteImage={onDeleteImage}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeImage ? (
            <ProductImageCard
              image={activeImage}
              isDeletePending={false}
              isDragDisabled
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
