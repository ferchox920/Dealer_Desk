import styles from '@/components/ui/StatusBadge.module.css';

export function StatusBadge({ children, className = '', tone = 'neutral' }) {
  return (
    <span className={[styles.badge, styles[`badge--${tone}`], className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
