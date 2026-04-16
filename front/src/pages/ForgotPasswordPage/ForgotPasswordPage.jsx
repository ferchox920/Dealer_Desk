import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { forgotPasswordRequest } from '@/services/auth.service';
import { APP_ROUTES } from '@/lib/config';
import { extractApiFieldErrors, validateForgotPasswordForm } from '@/utils/validation';
import styles from '@/pages/AuthFlow/AuthFlow.module.css';

export function ForgotPasswordPage() {
  const [values, setValues] = useState({
    email: '',
  });
  const [errors, setErrors] = useState({});
  const [alertState, setAlertState] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateForgotPasswordForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setAlertState({
        type: 'error',
        title: 'Revisa el formulario',
        message: 'Ingresa un email valido para poder continuar.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setAlertState(null);

      await forgotPasswordRequest({
        email: values.email.trim(),
      });

      setAlertState({
        type: 'success',
        title: 'Revisa tu correo',
        message: 'Si el email existe y esta habilitado, te enviaremos un enlace seguro para crear una nueva password.',
      });
    } catch (error) {
      const apiFieldErrors = extractApiFieldErrors(error);

      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors(apiFieldErrors);
      }

      setAlertState({
        type: 'error',
        title: 'No pudimos enviar el correo',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.layout}>
      <Card className={styles.panel}>
        <div className={styles.copy}>
          <span className={styles.badge}>Recuperacion de acceso</span>
          <p className="page-eyebrow">Dealer Desk Admin</p>
          <h1 className="page-title">Olvidaste tu password</h1>
          <p className="page-subtitle">
            Te enviaremos un enlace temporal para definir una nueva password desde el mismo flujo seguro de invitacion.
          </p>
        </div>

        <Alert {...(alertState || {})} />

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField
            error={errors.email}
            hint="Por seguridad, siempre mostraremos la misma respuesta aunque el email no exista."
            label="Email"
            name="email"
          >
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="owner@dealerdesk.local"
              value={values.email}
              onChange={handleChange}
            />
          </FormField>

          <div className={styles.actions}>
            <Button isBlock isLoading={isSubmitting} type="submit">
              Enviar enlace
            </Button>
          </div>
        </form>

        <div className={styles.secondaryActions}>
          <span>Si ya tienes el enlace del correo, abre ese acceso seguro para continuar.</span>
          <Link className={styles.textLink} to={APP_ROUTES.login}>
            Volver al login
          </Link>
        </div>

        <div className={styles.footer}>
          <p className="muted-text">El enlace debe vencer en 12 horas y ser de un solo uso.</p>
          <p className="muted-text">Cuando conectemos el backend, esta vista ya queda lista para usarlo.</p>
        </div>
      </Card>
    </main>
  );
}
