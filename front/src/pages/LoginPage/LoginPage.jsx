import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useAuth } from '@/hooks/useAuth';
import { APP_ROUTES } from '@/lib/config';
import { extractApiFieldErrors, validateLoginForm } from '@/utils/validation';
import styles from '@/pages/LoginPage/LoginPage.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [values, setValues] = useState({
    email: '',
    password: '',
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

    const validationErrors = validateLoginForm(values);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setAlertState({
        type: 'error',
        title: 'Revisa el formulario',
        message: 'Completa email y password con un formato valido.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setAlertState(null);
      await login(values);
      navigate(APP_ROUTES.dashboard, { replace: true });
    } catch (error) {
      const apiFieldErrors = extractApiFieldErrors(error);

      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors(apiFieldErrors);
      }

      setAlertState({
        type: 'error',
        title: 'Login no completado',
        message: error?.message || 'No pudimos iniciar sesion.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.layout}>
      <Card className={styles.panel}>
        <div className={styles.copy}>
          <p className="page-eyebrow">Dealer Desk Admin</p>
          <h1 className="page-title">Entrar al panel</h1>
          <p className="page-subtitle">
            Inicia sesion para revisar el dashboard, gestionar inventario y trabajar el panel privado.
          </p>
        </div>

        <Alert {...(alertState || {})} />

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField error={errors.email} hint="Usa un admin activo ya creado en el backend." label="Email" name="email">
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

          <FormField error={errors.password} label="Password" name="password">
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="Tu password"
              toggleLabel="la password"
              value={values.password}
              onChange={handleChange}
            />
          </FormField>

          <div className={styles.auxRow}>
            <p className="muted-text">Si recibiste una invitacion o necesitas resetear tu acceso, usa el enlace del correo.</p>
            <Link className={styles.textLink} to={APP_ROUTES.forgotPassword}>
              Olvide mi password
            </Link>
          </div>

          <Button isBlock isLoading={isSubmitting} type="submit">
            Entrar al panel
          </Button>
        </form>

        <div className={styles.footer}>
          <p className="muted-text">Frontend React: http://localhost:3001</p>
          <p className="muted-text">Backend API: http://localhost:3000</p>
        </div>
      </Card>
    </main>
  );
}
