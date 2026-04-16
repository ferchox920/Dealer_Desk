import styles from '@/components/ui/FormField.module.css';

export function FormField({ children, error, hint, label, name }) {
  return (
    <div className={[styles.field, error ? styles['field--invalid'] : ''].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={name}>
        {label}
      </label>
      {children}
      {error ? <p className={styles.error}>{error}</p> : hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
