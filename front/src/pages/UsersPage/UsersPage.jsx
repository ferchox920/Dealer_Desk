import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UserForm } from '@/components/user/UserForm';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_ROLES } from '@/lib/config';
import {
  createUserRequest,
  deleteUserRequest,
  listUsersRequest,
  resendUserInviteRequest,
  updateUserRequest,
} from '@/services/users.service';
import { formatDateTime, formatNumber } from '@/utils/formatters';
import { extractApiFieldErrors, validateUserForm } from '@/utils/validation';
import styles from '@/pages/UsersPage/UsersPage.module.css';

const initialValues = {
  name: '',
  email: '',
  password: '',
  role: '',
  is_active: true,
};

function isPendingPasswordSetup(user) {
  return user?.password_status === 'pending'
    || user?.password_setup_status === 'pending'
    || user?.has_password === false
    || user?.requires_password_setup === true;
}

export function UsersPage() {
  const { admin, withFreshAccess } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [formValues, setFormValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [alertState, setAlertState] = useState(null);
  const [editingUserId, setEditingUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(editingUserId);

  const loadUsers = useCallback(async ({ keepLoading = false } = {}) => {
    if (keepLoading) {
      setIsLoading(true);
    }

    try {
      setErrorMessage('');
      const usersResponse = await withFreshAccess((accessToken) => listUsersRequest(accessToken));
      setUsers(usersResponse);
    } catch (error) {
      setErrorMessage(error?.message || 'No pudimos cargar los usuarios del panel.');
    } finally {
      if (keepLoading) {
        setIsLoading(false);
      }
    }
  }, [withFreshAccess]);

  useEffect(() => {
    loadUsers({ keepLoading: true });
  }, [loadUsers]);

  function resetForm() {
    setFormValues(initialValues);
    setErrors({});
    setEditingUserId('');
  }

  function handleChange(event) {
    const { name, type, value, checked } = event.target;

    setFormValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((current) => ({
      ...current,
      [name]: '',
    }));
  }

  function handleEdit(user) {
    setEditingUserId(user.id);
    setAlertState(null);
    setErrors({});
    setFormValues({
      name: user.name || '',
      email: user.email,
      password: '',
      role: user.role,
      is_active: Boolean(user.is_active),
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateUserForm(formValues);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setAlertState({
        type: 'error',
        title: 'Revisa el formulario',
        message: 'Corrige los campos marcados antes de guardar el usuario.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setAlertState(null);
      const isInviteFlow = !isEditing && !formValues.password.trim();

      // El payload sigue el contrato real de user.routes.js:
      // create usa POST /users y update usa PATCH /users/:id.
      // Con el flujo nuevo, password vacia en create significa:
      // "crear el usuario y disparar invitacion por correo".
      const payload = {
        name: formValues.name,
        email: formValues.email.trim(),
        role: formValues.role,
        is_active: Boolean(formValues.is_active),
      };

      if (formValues.password.trim()) {
        payload.password = formValues.password.trim();
      }

      if (isEditing) {
        await withFreshAccess((accessToken) =>
          updateUserRequest(editingUserId, payload, accessToken),
        );
      } else {
        const createdUser = await withFreshAccess((accessToken) =>
          createUserRequest(payload, accessToken),
        );

        await loadUsers();
        resetForm();
        setAlertState({
          type: !isInviteFlow || createdUser?.invite_email_sent !== false ? 'success' : 'error',
          title: isInviteFlow ? 'Usuario creado' : 'Usuario creado',
          message: isInviteFlow
            ? createdUser?.invite_email_sent === false
              ? 'El usuario se creo, pero el correo de invitacion no pudo salir. Revisa SMTP y usa reenviar invitacion.'
              : 'El usuario queda listo para recibir su invitacion por correo y crear su propia password.'
            : 'El nuevo usuario ya existe en el sistema con password manual.',
        });

        return;
      }

      await loadUsers();
      resetForm();
      setAlertState({
        type: 'success',
        title: isEditing ? 'Usuario actualizado' : 'Usuario creado',
        message: isEditing
          ? 'Los cambios ya quedaron guardados en el backend.'
          : isInviteFlow
            ? 'El usuario queda listo para recibir su invitacion por correo y crear su propia password.'
            : 'El nuevo usuario ya existe en el sistema con password manual.',
      });
    } catch (error) {
      const apiFieldErrors = extractApiFieldErrors(error);

      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors(apiFieldErrors);
      }

      setAlertState({
        type: 'error',
        title: isEditing ? 'No pudimos actualizar el usuario' : 'No pudimos crear el usuario',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendInvite(user) {
    const confirmed = window.confirm(`Vas a reenviar la invitacion segura a ${user.email}. El enlace anterior debe invalidarse. ¿Continuar?`);

    if (!confirmed) {
      return;
    }

    try {
      setAlertState(null);
      const inviteResult = await withFreshAccess((accessToken) => resendUserInviteRequest(user.id, accessToken));
      await loadUsers();
      setAlertState({
        type: inviteResult?.invite_email_sent === false ? 'error' : 'success',
        title: inviteResult?.invite_email_sent === false ? 'Invitacion creada sin envio' : 'Invitacion reenviada',
        message: inviteResult?.invite_email_sent === false
          ? `Se genero un nuevo enlace para ${user.email}, pero el correo no pudo salir. Revisa SMTP e intenta otra vez.`
          : `Ya dejamos listo el reenvio de acceso para ${user.email}.`,
      });
    } catch (error) {
      setAlertState({
        type: 'error',
        title: 'No pudimos reenviar la invitacion',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    }
  }

  async function handleDelete(user) {
    const confirmed = window.confirm(`Vas a eliminar a ${user.email}. Esta accion no se puede deshacer.`);

    if (!confirmed) {
      return;
    }

    try {
      setAlertState(null);
      await withFreshAccess((accessToken) => deleteUserRequest(user.id, accessToken));
      await loadUsers();

      if (editingUserId === user.id) {
        resetForm();
      }

      setAlertState({
        type: 'success',
        title: 'Usuario eliminado',
        message: `${user.email} ya no existe en el panel.`,
      });
    } catch (error) {
      setAlertState({
        type: 'error',
        title: 'No pudimos eliminar el usuario',
        message: error?.message || 'Intenta de nuevo en un momento.',
      });
    }
  }

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.is_active).length,
      owners: users.filter((user) => user.role === ADMIN_ROLES.owner).length,
      staff: users.filter((user) => user.role === ADMIN_ROLES.staff).length,
      pending: users.filter((user) => isPendingPasswordSetup(user)).length,
    };
  }, [users]);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Usuarios"
        subtitle="Desde aqui ya puedes crear, editar y eliminar usuarios del panel usando el backend real actual."
        title="Equipo administrativo"
      />

      <Alert {...(alertState || {})} />

      {errorMessage ? (
        <Alert
          type="error"
          title="No pudimos cargar los usuarios"
          message={errorMessage}
        />
      ) : null}

      <section className={styles.summaryRow}>
        <Card className={styles.summaryCard}>
          <span>Total</span>
          <strong>{formatNumber(summary.total)}</strong>
        </Card>
        <Card className={styles.summaryCard}>
          <span>Activos</span>
          <strong>{formatNumber(summary.active)}</strong>
        </Card>
        <Card className={styles.summaryCard}>
          <span>Owners</span>
          <strong>{formatNumber(summary.owners)}</strong>
        </Card>
        <Card className={styles.summaryCard}>
          <span>Staff</span>
          <strong>{formatNumber(summary.staff)}</strong>
        </Card>
        <Card className={styles.summaryCard}>
          <span>Invitados</span>
          <strong>{formatNumber(summary.pending)}</strong>
        </Card>
      </section>

      <section className={styles.contentGrid}>
        <Card className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className="page-eyebrow">{isEditing ? 'Editar' : 'Crear'}</p>
              <h2 className="section-title">{isEditing ? 'Editar usuario' : 'Crear usuario'}</h2>
            </div>
            <p className="muted-text">
              Solo `owner` puede gestionar usuarios. Crear sin password deja el flujo listo para invitacion por correo.
            </p>
          </div>

          <UserForm
            errors={errors}
            isEditing={isEditing}
            isSubmitting={isSubmitting}
            onCancel={resetForm}
            onChange={handleChange}
            onSubmit={handleSubmit}
            values={formValues}
          />
        </Card>

        <Card className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className="page-eyebrow">Vista actual</p>
              <h2 className="section-title">Usuarios del sistema</h2>
            </div>
            <p className="muted-text">
              Puedes entrar en modo edicion desde cada fila y borrar usuarios cuando haga falta.
            </p>
          </div>

          {isLoading ? (
            <Loader label="Cargando usuarios..." />
          ) : users.length === 0 ? (
            <div className={styles.emptyState}>Todavia no hay usuarios administrativos cargados.</div>
          ) : (
            <div className={styles.table}>
              <div className={[styles.row, styles.headRow].join(' ')}>
                <span>Usuario</span>
                <span>Rol</span>
                <span>Estado</span>
                <span>Ultimo login</span>
                <span>Creado</span>
                <span>Acciones</span>
              </div>

              {users.map((user) => {
                const isCurrentAdmin = admin?.id === user.id;

                return (
                  <div className={styles.row} key={user.id}>
                    <div className={styles.userCell}>
                      <strong>{user.name || 'Sin nombre'}</strong>
                      <span>{user.email}</span>
                      {isPendingPasswordSetup(user) ? (
                        <small className={styles.pendingLabel}>Invitacion pendiente de completar</small>
                      ) : null}
                    </div>
                    <span>
                      <StatusBadge tone={user.role === ADMIN_ROLES.owner ? 'primary' : 'neutral'}>
                        {user.role}
                      </StatusBadge>
                    </span>
                    <span>
                      <StatusBadge tone={user.is_active ? 'success' : 'danger'}>
                        {user.is_active ? 'activo' : 'inactivo'}
                      </StatusBadge>
                    </span>
                    <span>{formatDateTime(user.last_login_at)}</span>
                    <span>{formatDateTime(user.created_at)}</span>
                    <div className={styles.actionsCell}>
                      {isPendingPasswordSetup(user) ? (
                        <Button
                          className={styles.rowButton}
                          onClick={() => handleResendInvite(user)}
                          variant="secondary"
                        >
                          Reenviar invitacion
                        </Button>
                      ) : null}
                      <Button className={styles.rowButton} onClick={() => handleEdit(user)} variant="secondary">
                        Editar
                      </Button>
                      <Button
                        className={styles.rowButton}
                        disabled={isCurrentAdmin}
                        onClick={() => handleDelete(user)}
                        variant="danger"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
