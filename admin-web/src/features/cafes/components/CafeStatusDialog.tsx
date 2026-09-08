import { Button, Card } from '../../../components';
import type { CafeStatus } from '../types';
import styles from './CafeStatusDialog.module.css';

export interface CafeStatusDialogProps {
  open: boolean;
  currentStatus: CafeStatus;
  requestedStatus: CafeStatus | null;
  isSubmitting: boolean;
  errorMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Confirms a status change before it is sent, and never claims success on
// its own - the dialog only closes (see CafeDetail.tsx) once the mutation's
// onSuccess actually fires with a fresh AdminCafeDetailResponse from the
// backend. A failed request leaves the dialog open with errorMessage set,
// and the displayed "current status" never changes locally.
export function CafeStatusDialog({
  open,
  currentStatus,
  requestedStatus,
  isSubmitting,
  errorMessage,
  onConfirm,
  onCancel,
}: CafeStatusDialogProps) {
  if (!open || !requestedStatus) {
    return null;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="cafe-status-dialog-title">
      <Card className={styles.dialog}>
        <h2 id="cafe-status-dialog-title" className={styles.title}>
          Change cafe status
        </h2>
        <p className={styles.body}>
          Current status: <strong>{currentStatus}</strong>
          <br />
          Requested status: <strong>{requestedStatus}</strong>
        </p>
        {requestedStatus === 'ARCHIVED' ? (
          <p className={styles.warning}>
            Archiving a cafe removes it from the public search/listing endpoints.
          </p>
        ) : null}

        {errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button label="Cancel" variant="outline" onClick={onCancel} disabled={isSubmitting} />
          <Button label="Confirm" onClick={onConfirm} loading={isSubmitting} disabled={isSubmitting} />
        </div>
      </Card>
    </div>
  );
}
