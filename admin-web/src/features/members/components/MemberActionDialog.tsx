import { Button, Card } from '../../../components';
import type { MemberStatus } from '../types';
import styles from './MemberActionDialog.module.css';

export type MemberAction = 'SUSPEND' | 'REACTIVATE';

export interface MemberActionDialogProps {
  open: boolean;
  action: MemberAction | null;
  memberId: string;
  // null means this app does not currently know the member's status - there
  // is no lookup endpoint to confirm it beforehand (see features/members/api.ts).
  // Showing "Unknown" here is the honest option; a fabricated guess is not.
  knownStatus: MemberStatus | null;
  isSubmitting: boolean;
  errorMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ACTION_LABEL: Record<MemberAction, string> = {
  SUSPEND: 'Suspend',
  REACTIVATE: 'Reactivate',
};

// Confirms a suspend/reactivate action before it is sent, and never claims
// success on its own - the dialog only closes once the mutation's
// onSuccess actually fires with a fresh MemberDto from the backend. A
// failed request leaves the dialog open with errorMessage set, and the
// displayed status never changes on its own.
export function MemberActionDialog({
  open,
  action,
  memberId,
  knownStatus,
  isSubmitting,
  errorMessage,
  onConfirm,
  onCancel,
}: MemberActionDialogProps) {
  if (!open || !action) {
    return null;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="member-action-dialog-title">
      <Card className={styles.dialog}>
        <h2 id="member-action-dialog-title" className={styles.title}>
          {ACTION_LABEL[action]} member
        </h2>
        <p className={styles.body}>
          Member ID: <strong>{memberId}</strong>
          <br />
          Current status: <strong>{knownStatus ?? 'Unknown'}</strong>
          <br />
          Requested action: <strong>{ACTION_LABEL[action]}</strong>
        </p>
        {knownStatus === null ? (
          <p className={styles.warning}>
            This app has no way to look up a member&apos;s current status before acting - if this member is
            already in the target state, the backend will reject this request.
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
