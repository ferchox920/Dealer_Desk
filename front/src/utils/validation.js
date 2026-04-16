import { PASSWORD_RULES } from '@/lib/config';

const PRODUCT_CURRENCY_OPTIONS = ['CLP', 'USD'];

const STRONG_PASSWORD_MESSAGE = `La password debe tener minimo ${PASSWORD_RULES.minLength} caracteres, 1 mayuscula, 1 numero y 1 caracter especial.`;

function isStrongPassword(value) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(value);
}

function validateEmailField(value, fieldName = 'email') {
  if (!value.trim()) {
    return `El ${fieldName} es obligatorio.`;
  }

  if (!value.includes('@')) {
    return 'Ingresa un email valido.';
  }

  return '';
}

function validateStrongPasswordField(value, options = {}) {
  const {
    allowEmpty = false,
    label = 'La password',
  } = options;
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return allowEmpty ? '' : `${label} es obligatoria.`;
  }

  if (normalizedValue.length < PASSWORD_RULES.minLength || !isStrongPassword(normalizedValue)) {
    return STRONG_PASSWORD_MESSAGE;
  }

  return '';
}

export function extractApiFieldErrors(error) {
  if (!Array.isArray(error?.data?.errors)) {
    return {};
  }

  return error.data.errors.reduce((accumulator, item) => {
    if (item?.field && item?.message) {
      accumulator[item.field] = item.message;
    }

    return accumulator;
  }, {});
}

export function validateLoginForm(values) {
  const nextErrors = {};

  const emailError = validateEmailField(values.email);

  if (emailError) {
    nextErrors.email = emailError;
  }

  if (!values.password.trim()) {
    nextErrors.password = 'La password es obligatoria.';
  } else if (values.password.trim().length < PASSWORD_RULES.minLength) {
    nextErrors.password = `La password debe tener al menos ${PASSWORD_RULES.minLength} caracteres.`;
  }

  return nextErrors;
}

export function validateForgotPasswordForm(values) {
  const nextErrors = {};
  const emailError = validateEmailField(values.email);

  if (emailError) {
    nextErrors.email = emailError;
  }

  return nextErrors;
}

export function validatePasswordActionForm(values) {
  const nextErrors = {};
  const passwordError = validateStrongPasswordField(values.password);

  if (passwordError) {
    nextErrors.password = passwordError;
  }

  if (!values.confirmPassword.trim()) {
    nextErrors.confirmPassword = 'Confirma la password.';
  } else if (values.password.trim() !== values.confirmPassword.trim()) {
    nextErrors.confirmPassword = 'Las passwords no coinciden.';
  }

  return nextErrors;
}

export function validateProductForm(values) {
  const nextErrors = {};
  const currentYear = new Date().getFullYear() + 1;
  const year = Number.parseInt(values.year, 10);
  const mileage = Number.parseInt(values.mileage, 10);
  const price = Number.parseInt(values.price, 10);
  const currencyCode = String(values.currency_code || '').toUpperCase();

  if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
    nextErrors.year = `Ingresa un year valido entre 1900 y ${currentYear}.`;
  }

  if (!values.brand.trim()) {
    nextErrors.brand = 'La marca es obligatoria.';
  }

  if (!values.model.trim()) {
    nextErrors.model = 'El modelo es obligatorio.';
  }

  if (!Number.isInteger(mileage) || mileage < 0) {
    nextErrors.mileage = 'El mileage debe ser un numero entero mayor o igual a 0.';
  }

  if (!Number.isInteger(price) || price <= 0) {
    nextErrors.price = 'El precio debe ser un numero entero mayor a 0.';
  }

  if (!PRODUCT_CURRENCY_OPTIONS.includes(currencyCode)) {
    nextErrors.currency_code = 'Selecciona una moneda valida.';
  }

  if (!values.drive_train.trim()) {
    nextErrors.drive_train = 'La traccion es obligatoria.';
  }

  if (!values.fuel_type.trim()) {
    nextErrors.fuel_type = 'El combustible es obligatorio.';
  }

  if (!values.vin_number.trim()) {
    nextErrors.vin_number = 'El VIN es obligatorio.';
  }

  return nextErrors;
}

export function validateUserForm(values) {
  const nextErrors = {};

  const emailError = validateEmailField(values.email);

  if (emailError) {
    nextErrors.email = emailError;
  }

  if (!values.role) {
    nextErrors.role = 'El rol es obligatorio.';
  }

  const passwordError = validateStrongPasswordField(values.password, {
    allowEmpty: true,
  });

  if (passwordError) {
    nextErrors.password = passwordError;
  }

  return nextErrors;
}
