import styles from '@/components/ui/Alert.module.css';

export function Alert({ message, title = '', type = 'info' }) {
  if (!message) {
    return null;
  }

  return (
    <div className={[styles.alert, styles[`alert--${type}`]].join(' ')} role="alert">
      {title ? <strong className={styles.title}>{title}</strong> : null}
      <p className={styles.message}>{message}</p>
    </div>
  );
}
