import { Button, Card } from '../../../components';
import type { DrinkStatus } from '../types';
import styles from './DrinkStatusDialog.module.css';

export interface DrinkStatusDialogProps {
  open: boolean;
  currentStatus: DrinkStatus;
  requestedStatus: DrinkStatus | null;
  isSubmitting: boolean;
  errorMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Confirms a status change before it is sent, and never claims success on
// its own - the dialog only closes once the mutation's onSuccess actually
// fires with a fresh DrinkResponse from the backend. A failed request
// leaves the dialog open with errorMessage set.
export function DrinkStatusDialog({
  open,
  currentStatus,
  requestedStatus,
  isSubmitting,
  errorMessage,
  onConfirm,
  onCancel,
}: DrinkStatusDialogProps) {
  if (!open || !requestedStatus) {
    return null;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="drink-status-dialog-title">
      <Card className={styles.dialog}>
        <h2 id="drink-status-dialog-title" className={styles.title}>
          Change drink status
        </h2>
        <p className={styles.body}>
          Current status: <strong>{currentStatus}</strong>
          <br />
          Requested status: <strong>{requestedStatus}</strong>
        </p>
        {requestedStatus === 'ARCHIVED' ? (
          <p className={styles.warning}>
            Archiving a drink is permanent through this app: every drink endpoint it can reach (the public detail
            lookup and every admin write endpoint) stops returning an archived drink, so it can&apos;t be viewed,
            edited, or reactivated here again once archived.
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
