import { Button } from './Button';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <div className={styles.container} role="alert">
      <p className={styles.title}>{title}</p>
      <p className={styles.message}>{message}</p>
      {onRetry ? <Button label={retryLabel} variant="outline" onClick={onRetry} /> : null}
    </div>
  );
}
