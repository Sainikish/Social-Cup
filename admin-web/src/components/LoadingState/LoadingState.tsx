import styles from './LoadingState.module.css';

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      {label ? <p className={styles.label}>{label}</p> : null}
    </div>
  );
}
