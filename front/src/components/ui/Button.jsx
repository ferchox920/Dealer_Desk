import styles from '@/components/ui/Button.module.css';

export function Button({
  children,
  className = '',
  isBlock = false,
  isLoading = false,
  variant = 'primary',
  ...props
}) {
  const classNames = [
    styles.button,
    styles[`button--${variant}`],
    isBlock ? styles['button--block'] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...props}
      className={classNames}
      disabled={props.disabled || isLoading}
      type={props.type || 'button'}
    >
      {isLoading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
