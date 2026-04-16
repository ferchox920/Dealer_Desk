import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ADMIN_ROLES, PASSWORD_RULES } from '@/lib/config';
import styles from '@/components/user/UserForm.module.css';

export function UserForm({
  errors,
  isEditing = false,
  isSubmitting = false,
  onCancel,
  onChange,
  onSubmit,
  values,
}) {
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.grid}>
        <FormField
          error={errors.name}
          hint="Opcional. Si lo dejas vacio, el backend lo guarda como null."
          label="Nombre"
          name="name"
        >
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Admin principal"
            value={values.name}
            onChange={onChange}
          />
        </FormField>

        <FormField error={errors.email} label="Email" name="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="staff@dealerdesk.local"
            value={values.email}
            onChange={onChange}
          />
        </FormField>

        <FormField
          error={errors.password}
          hint={
            isEditing
              ? `Solo completa este campo si quieres cambiar la password. ${PASSWORD_RULES.hint}`
              : `Opcional. Si la dejas vacia, el backend debe enviar invitacion por correo. ${PASSWORD_RULES.hint}`
          }
          label={isEditing ? 'Nueva password' : 'Password inicial'}
          name="password"
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder={isEditing ? 'Nueva password opcional' : 'Dejala vacia para enviar invitacion'}
            toggleLabel={isEditing ? 'la nueva password' : 'la password inicial'}
            value={values.password}
            onChange={onChange}
          />
        </FormField>

        <FormField error={errors.role} label="Rol" name="role">
          <select id="role" name="role" value={values.role} onChange={onChange}>
            <option value="">Selecciona un rol</option>
            <option value={ADMIN_ROLES.owner}>Owner</option>
            <option value={ADMIN_ROLES.staff}>Staff</option>
          </select>
        </FormField>

        <label className={styles.checkbox}>
          <input
            checked={values.is_active}
            name="is_active"
            type="checkbox"
            onChange={onChange}
          />
          <span>Usuario activo</span>
        </label>
      </div>

      <div className={styles.actions}>
        <Button isLoading={isSubmitting} type="submit">
          {isEditing ? 'Guardar cambios' : 'Crear usuario'}
        </Button>

        {isEditing ? (
          <Button onClick={onCancel} type="button" variant="secondary">
            Cancelar edicion
          </Button>
        ) : null}
      </div>

      {!isEditing ? (
        <p className={styles.helpText}>
          Crear con password lo deja listo para entrar. Crear sin password deja preparada la invitacion por correo.
        </p>
      ) : null}
    </form>
  );
}
