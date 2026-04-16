import styles from '@/components/ui/PageHeader.module.css';

export function PageHeader({
  actions,
  eyebrow,
  subtitle,
  title,
}) {
  return (
    <header className={styles.header}>
      <div className={styles.copy}>
        <p className="page-eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>

      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
