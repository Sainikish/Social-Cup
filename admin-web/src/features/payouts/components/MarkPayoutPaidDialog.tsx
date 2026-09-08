import { useState, type FormEvent } from 'react';

import { Button, Card, Input } from '../../../components';
import type { PayoutResponse } from '../types';
import styles from './MarkPayoutPaidDialog.module.css';

export interface MarkPayoutPaidDialogProps {
  open: boolean;
  payout: PayoutResponse | null;
  isSubmitting: boolean;
  errorMessage?: string;
  fieldErrors?: Record<string, string>;
  onConfirm: (values: { amountPaid: string; paymentReference: string; paymentDate: string }) => void;
  onCancel: () => void;
}

// Collects exactly the three fields PATCH /admin/cafes/{cafeId}/payouts/{payoutId}
// accepts - amountPaid, paymentReference, paymentDate - and nothing else.
// amountOwed/totals/period/cafe are shown here only as read-only context
// from the backend's own PayoutResponse, never as editable fields, and are
// never sent back in the request.
export function MarkPayoutPaidDialog({
  open,
  payout,
  isSubmitting,
  errorMessage,
  fieldErrors = {},
  onConfirm,
  onCancel,
}: MarkPayoutPaidDialogProps) {
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [syncedPayoutId, setSyncedPayoutId] = useState<string | null>(null);

  const currentPayoutId = payout?.id ?? null;
  // Resets the form whenever a different payout is opened, adjusting state
  // during render (React's recommended pattern) rather than in an effect.
  if (currentPayoutId !== syncedPayoutId) {
    setSyncedPayoutId(currentPayoutId);
    setAmountPaid(payout ? String(payout.amountOwed) : '');
    setPaymentReference('');
    setPaymentDate('');
  }

  if (!open || !payout) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm({ amountPaid, paymentReference, paymentDate });
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="mark-payout-paid-title">
      <Card className={styles.dialog}>
        <h2 id="mark-payout-paid-title" className={styles.title}>
          Mark Payout Paid
        </h2>
        <p className={styles.body}>
          Payout ID: <strong>{payout.id}</strong>
          <br />
          Amount owed: <strong>${payout.amountOwed.toFixed(2)}</strong>
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            id="mark-paid-amount"
            label="Amount Paid"
            inputMode="decimal"
            value={amountPaid}
            onChange={(event) => setAmountPaid(event.target.value)}
            errorMessage={fieldErrors.amountPaid}
            disabled={isSubmitting}
          />
          <Input
            id="mark-paid-reference"
            label="Payment Reference"
            value={paymentReference}
            onChange={(event) => setPaymentReference(event.target.value)}
            errorMessage={fieldErrors.paymentReference}
            disabled={isSubmitting}
          />
          <Input
            id="mark-paid-date"
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            errorMessage={fieldErrors.paymentDate}
            disabled={isSubmitting}
          />

          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className={styles.actions}>
            <Button type="button" label="Cancel" variant="outline" onClick={onCancel} disabled={isSubmitting} />
            <Button type="submit" label="Confirm" loading={isSubmitting} disabled={isSubmitting} />
          </div>
        </form>
      </Card>
    </div>
  );
}
