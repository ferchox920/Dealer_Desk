import styles from '@/components/ui/Card.module.css';

export function Card({ as: Component = 'section', children, className = '', ...props }) {
  return (
    <Component
      {...props}
      className={[styles.card, className].filter(Boolean).join(' ')}
    >
      {children}
    </Component>
  );
}
