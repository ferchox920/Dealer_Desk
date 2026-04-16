import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { PRODUCT_CURRENCIES } from '@/lib/config';
import styles from '@/components/product/ProductForm.module.css';

export function ProductForm({
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  submitLabel = 'Crear producto',
  values,
}) {
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.grid}>
        <FormField error={errors.year} label="Ano" name="year">
          <input
            id="year"
            name="year"
            type="number"
            inputMode="numeric"
            min="1900"
            placeholder="2024"
            value={values.year}
            onChange={onChange}
          />
        </FormField>

        <FormField error={errors.brand} label="Marca" name="brand">
          <input
            id="brand"
            name="brand"
            type="text"
            placeholder="Toyota"
            value={values.brand}
            onChange={onChange}
          />
        </FormField>

        <FormField error={errors.model} label="Modelo" name="model">
          <input
            id="model"
            name="model"
            type="text"
            placeholder="Camry"
            value={values.model}
            onChange={onChange}
          />
        </FormField>

        <FormField error={errors.mileage} label="Kilometraje" name="mileage">
          <input
            id="mileage"
            name="mileage"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="35000"
            value={values.mileage}
            onChange={onChange}
          />
        </FormField>

        <FormField error={errors.price} label="Precio" name="price">
          <input
            id="price"
            name="price"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="28500"
            value={values.price}
            onChange={onChange}
          />
        </FormField>

        <FormField
          error={errors.currency_code}
          hint="Cada producto guarda su propia moneda."
          label="Moneda"
          name="currency_code"
        >
          <select
            id="currency_code"
            name="currency_code"
            value={values.currency_code}
            onChange={onChange}
          >
            <option value={PRODUCT_CURRENCIES.USD}>USD $</option>
            <option value={PRODUCT_CURRENCIES.CLP}>CLP $</option>
          </select>
        </FormField>

        <FormField error={errors.drive_train} label="Traccion" name="drive_train">
          <input
            id="drive_train"
            name="drive_train"
            type="text"
            placeholder="FWD"
            value={values.drive_train}
            onChange={onChange}
          />
        </FormField>

        <FormField error={errors.fuel_type} label="Combustible" name="fuel_type">
          <input
            id="fuel_type"
            name="fuel_type"
            type="text"
            placeholder="Gasolina"
            value={values.fuel_type}
            onChange={onChange}
          />
        </FormField>

        <FormField error={errors.vin_number} label="VIN" name="vin_number">
          <input
            id="vin_number"
            name="vin_number"
            type="text"
            placeholder="VIN123456789"
            value={values.vin_number}
            onChange={onChange}
          />
        </FormField>

        <div className={styles.full}>
          <FormField
            error={errors.description}
            hint="Este campo es opcional."
            label="Descripcion"
            name="description"
          >
            <textarea
              id="description"
              name="description"
              rows="5"
              placeholder="Vehiculo bien mantenido, unico dueno."
              value={values.description}
              onChange={onChange}
            />
          </FormField>
        </div>
      </div>

      <div className={styles.actions}>
        <Button isLoading={isSubmitting} type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
