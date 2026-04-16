import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Loader } from '@/components/ui/Loader';
import { PasswordInput } from '@/components/ui/PasswordInput';
import {
  completePasswordActionRequest,
  verifyPasswordActionRequest,
} from '@/services/auth.service';
import { APP_ROUTES, PASSWORD_RULES } from '@/lib/config';
import { extractApiFieldErrors, validatePasswordActionForm } from '@/utils/validation';
import styles from '@/pages/AuthFlow/AuthFlow.module.css';

function readPasswordToken(search, hash) {
  const searchParams = new URLSearchParams(search);
  const queryToken = searchParams.get('token');

  if (queryToken) {
    return queryToken;
  }

  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;

  if (!normalizedHash) {
    return '';
  }

  const hashParams = new URLSearchParams(normalizedHash);
  return hashParams.get('token') || '';
}

function resolveCopy(purpose) {
  if (purpose === 'invite') {
    return {
      badge: 'Invitacion segura',
      title: 'Crea tu password',
      subtitle: 'Este acceso viene desde tu correo y sirve para activar tu cuenta del panel admin.',
    };
  }

  return {
    badge: 'Recuperacion segura',
    title: 'Crea una nueva password',
    subtitle: 'Este acceso temporal sirve para restablecer tu password de forma segura y en un solo paso.',
  };
}

export function PasswordActionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useMemo(
    () => readPasswordToken(location.search, location.hash),
    [location.hash, location.search],
  );

  const [values, setValues] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [alertState, setAlertState] = useState(null);
  const [verification, setVerification] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyToken() {
      if (!token) {
        if (!cancelled) {
          setVerification(null);
          setAlertState({
            type: 'error',
            title: 'Enlace no valido',
            message: 'Este acceso necesita un token del correo. Abre el enlace original o solicita uno nuevo.',
          });
          setIsVerifying(false);
        }
        return;
      }

      try {
        setIsVerifying(true);
        setAlertState(null);

        const response = await verifyPasswordActionRequest({ token });

        if (!cancelled) {
          setVerification(response || {});
        }
      } catch (error) {
        if (!cancelled) {
          setVerification(null);
          setAlertState({
            type: 'error',
            title: 'Enlace vencido o invalido',
            message: error?.message || 'Solicita un nuevo correo para continuar.',
          });
        }
      } finally {
        if (!cancelled) {
          setIsVerifying(false);
        }
      }
    }

    verifyToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

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

    const validationErrors = validatePasswordActionForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setAlertState({
        type: 'error',
        title: 'Revisa la password',
        message: 'Corrige los campos marcados antes de guardar la nueva password.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setAlertState(null);

      await completePasswordActionRequest({
        token,
        password: values.password.trim(),
      });

      setIsCompleted(true);
      setValues({
        password: '',
        confirmPassword: '',
      });
      setAlertState({
        type: 'success',
        title: 'Password actualizada',
        message: 'Tu enlace ya quedo consumido. Desde ahora debes entrar con tu nueva password.',
      });
    } catch (error) {
      const apiFieldErrors = extractApiFieldErrors(error);

      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors(apiFieldErrors);
      }

      setAlertState({
        type: 'error',
        title: 'No pudimos guardar la password',
        message: error?.message || 'Solicita un nuevo enlace y vuelve a intentar.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isVerifying) {
    return <Loader fullscreen label="Validando enlace seguro..." />;
  }

  const copy = resolveCopy(verification?.purpose);

  return (
    <main className={styles.layout}>
      <Card className={styles.panel}>
        <div className={styles.copy}>
          <span className={styles.badge}>{copy.badge}</span>
          <p className="page-eyebrow">Dealer Desk Admin</p>
          <h1 className="page-title">{copy.title}</h1>
          <p className="page-subtitle">{copy.subtitle}</p>
          {verification?.email ? (
            <p className={styles.tokenMeta}>Cuenta objetivo: {verification.email}</p>
          ) : null}
        </div>

        <Alert {...(alertState || {})} />

        {!verification || isCompleted ? (
          <div className={styles.actions}>
            <Button isBlock type="button" onClick={() => navigate(APP_ROUTES.login)}>
              Ir al login
            </Button>
            <div className={styles.secondaryActions}>
              <span>Si el enlace ya vencio, usa el flujo de recuperacion para pedir uno nuevo.</span>
              <Link className={styles.textLink} to={APP_ROUTES.forgotPassword}>
                Solicitar otro enlace
              </Link>
            </div>
          </div>
        ) : (
          <>
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <FormField
                error={errors.password}
                hint={PASSWORD_RULES.hint}
                label="Nueva password"
                name="password"
              >
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="Nueva password"
                  toggleLabel="la nueva password"
                  value={values.password}
                  onChange={handleChange}
                />
              </FormField>

              <FormField
                error={errors.confirmPassword}
                hint="Escribela otra vez para evitar errores al guardar."
                label="Confirmar password"
                name="confirmPassword"
              >
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Repite la nueva password"
                  toggleLabel="la confirmacion de password"
                  value={values.confirmPassword}
                  onChange={handleChange}
                />
              </FormField>

              <section className={styles.requirements} aria-label="Reglas de password">
                <h2 className={styles.requirementsTitle}>Reglas de password</h2>
                <ul className={styles.requirementsList}>
                  <li>Minimo {PASSWORD_RULES.minLength} caracteres.</li>
                  <li>Al menos una letra mayuscula.</li>
                  <li>Al menos un numero.</li>
                  <li>Al menos un caracter especial.</li>
                </ul>
              </section>

              <div className={styles.actions}>
                <Button isBlock isLoading={isSubmitting} type="submit">
                  Guardar password
                </Button>
              </div>
            </form>

            <div className={styles.secondaryActions}>
              <span>Este acceso debe venir del correo y el enlace debe expirar despues de 12 horas.</span>
              <Link className={styles.textLink} to={APP_ROUTES.login}>
                Volver al login
              </Link>
            </div>
          </>
        )}

        <div className={styles.footer}>
          <p className="muted-text">El front admite token por query param o por hash para facilitar el enlace del correo.</p>
          <p className="muted-text">Cuando completes la password, este mismo acceso debe quedar inutilizado en el backend.</p>
        </div>
      </Card>
    </main>
  );
}
