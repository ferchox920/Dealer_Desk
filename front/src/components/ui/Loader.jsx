import styles from '@/components/ui/Loader.module.css';

export function Loader({ fullscreen = false, label = 'Cargando...' }) {
  return (
    <div className={[styles.loader, fullscreen ? styles['loader--fullscreen'] : ''].filter(Boolean).join(' ')}>
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
