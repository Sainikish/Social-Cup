import type { InputHTMLAttributes } from 'react';

import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  errorMessage?: string;
}

export function Input({ label, id, className, errorMessage, ...rest }: InputProps) {
  return (
    <label className={styles.wrapper} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <input
        id={id}
        className={[styles.input, className].filter(Boolean).join(' ')}
        aria-invalid={errorMessage ? true : undefined}
        {...rest}
      />
      {errorMessage ? (
        <span className={styles.error} role="alert">
          {errorMessage}
        </span>
      ) : null}
    </label>
  );
}
