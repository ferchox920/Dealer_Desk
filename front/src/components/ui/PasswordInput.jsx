import { useState } from 'react';
import styles from '@/components/ui/PasswordInput.module.css';

function EyeIcon({ isVisible }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.icon}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      {!isVisible ? (
        <path
          d="M4 4l16 16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      ) : null}
    </svg>
  );
}

export function PasswordInput({
  className,
  disabled = false,
  toggleLabel = 'la password',
  type: _ignoredType,
  ...inputProps
}) {
  const [isVisible, setIsVisible] = useState(false);
  const actionLabel = `${isVisible ? 'Ocultar' : 'Mostrar'} ${toggleLabel}`;

  return (
    <div className={styles.wrapper}>
      <input
        {...inputProps}
        className={[styles.input, className].filter(Boolean).join(' ')}
        disabled={disabled}
        type={isVisible ? 'text' : 'password'}
      />

      <button
        aria-label={actionLabel}
        aria-pressed={isVisible}
        className={styles.toggle}
        disabled={disabled}
        title={actionLabel}
        type="button"
        onClick={() => setIsVisible((current) => !current)}
      >
        <EyeIcon isVisible={isVisible} />
        <span className="sr-only">{actionLabel}</span>
      </button>
    </div>
  );
}
