import styles from './LoadingIndicator.module.css';

export interface LoadingIndicatorProps {
  label?: string;
}

export function LoadingIndicator({ label }: LoadingIndicatorProps) {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      {label ? <p className={styles.label}>{label}</p> : null}
    </div>
  );
}
