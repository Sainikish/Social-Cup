import type { InputHTMLAttributes } from 'react';

import styles from './TextField.module.css';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, id, className, ...rest }: TextFieldProps) {
  return (
    <label className={styles.wrapper} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <input id={id} className={[styles.input, className].filter(Boolean).join(' ')} {...rest} />
    </label>
  );
}
