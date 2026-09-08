import { useState } from 'react';
import { Link } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { Card, ErrorState, LoadingState } from '../../components';
import {
  MarkPayoutPaidDialog,
  payoutErrorMessage,
  toMarkPayoutPaidRequest,
  useAllPayoutsQuery,
  useMarkPayoutPaidMutation,
  validateMarkPayoutPaidForm,
  type PayoutResponse,
} from '../../features/payouts';
import { extractFieldErrors } from '../../utils/errors';
import styles from './PayoutList.module.css';

function formatPeriodDate(value: string | null): string {
  if (!value) {
    return 'Not set';
  }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

// Cross-cafe payout list, backed by GET /admin/payouts - a flat, unpaginated
// array with no query parameters. This screen reflects that honestly: no
// pagination controls, no search/filter box. Each PayoutResponse only
// carries the cafe's ID (never its name) - a link to the cafe's own detail
// screen is provided instead of fabricating a name lookup this app was
// never asked to make.
export function PayoutList() {
  const payoutsQuery = useAllPayoutsQuery();
  const markPaidMutation = useMarkPayoutPaidMutation();

  const [dialogPayout, setDialogPayout] = useState<PayoutResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dialogError, setDialogError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();

  function openMarkPaidDialog(payout: PayoutResponse) {
    setDialogError(undefined);
    setFieldErrors({});
    setSuccessMessage(undefined);
    setDialogPayout(payout);
  }

  function closeDialog() {
    setDialogPayout(null);
    setDialogError(undefined);
    setFieldErrors({});
  }

  function handleConfirm(values: { amountPaid: string; paymentReference: string; paymentDate: string }) {
    if (!dialogPayout) {
      return;
    }
    setDialogError(undefined);

    const errors = validateMarkPayoutPaidForm(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    markPaidMutation.mutate(
      {
        cafeId: dialogPayout.cafeId,
        payoutId: dialogPayout.id,
        request: toMarkPayoutPaidRequest(values),
      },
      {
        onSuccess: () => {
          setDialogPayout(null);
          setSuccessMessage('Payout marked as paid successfully.');
        },
        onError: (error) => {
          const apiError = toApiError(error);
          const violations = extractFieldErrors(apiError);
          if (Object.keys(violations).length > 0) {
            setFieldErrors(violations);
            return;
          }
          setDialogError(payoutErrorMessage(apiError.code));
        },
      }
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Payouts</h1>

      <Card className={styles.notice}>
        <p className={styles.noticeText}>
          This is the full, unpaginated list of payouts across every cafe, from{' '}
          <code>GET /admin/payouts</code> - there is no filter or search parameter on this endpoint. Amounts and
          totals shown are exactly what the backend returns; marking a payout paid records the payment details you
          enter but never changes the amount owed, totals, period, or cafe.
        </p>
      </Card>

      {successMessage ? (
        <p className={styles.successMessage} role="status">
          {successMessage}
        </p>
      ) : null}

      {payoutsQuery.isLoading ? <LoadingState label="Loading payouts…" /> : null}

      {payoutsQuery.isError ? (
        <ErrorState
          message={payoutErrorMessage(toApiError(payoutsQuery.error).code)}
          onRetry={() => payoutsQuery.refetch()}
        />
      ) : null}

      {payoutsQuery.isSuccess && payoutsQuery.data.length === 0 ? (
        <p className={styles.emptyMessage}>No payouts found.</p>
      ) : null}

      {payoutsQuery.isSuccess && payoutsQuery.data.length > 0 ? (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cafe</th>
                <th>Period</th>
                <th>Redemptions</th>
                <th>Credits</th>
                <th>Amount Owed</th>
                <th>Payment Status</th>
                <th>Reference</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payoutsQuery.data.map((payout) => (
                <tr key={payout.id}>
                  <td>
                    <Link to={`/cafes/${payout.cafeId}`}>{payout.cafeId}</Link>
                  </td>
                  <td>
                    {formatPeriodDate(payout.periodStart)} – {formatPeriodDate(payout.periodEnd)}
                  </td>
                  <td>{payout.totalRedemptions}</td>
                  <td>{payout.totalCredits}</td>
                  <td className={styles.amountOwed}>${payout.amountOwed.toFixed(2)}</td>
                  <td>
                    {payout.amountPaid != null ? (
                      <span className={styles.paidBadge}>${payout.amountPaid.toFixed(2)} paid</span>
                    ) : (
                      <span
                        className={styles.notRecordedBadge}
                        title="The backend does not currently record payment status for a payout - this is not the same as confirmed unpaid."
                      >
                        Not recorded
                      </span>
                    )}
                  </td>
                  <td>{payout.paymentReference ?? '—'}</td>
                  <td>
                    {payout.amountPaid == null ? (
                      <button
                        type="button"
                        className={styles.markPaidButton}
                        onClick={() => openMarkPaidDialog(payout)}
                        disabled={markPaidMutation.isPending}
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <span className={styles.noticeText}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <MarkPayoutPaidDialog
        open={dialogPayout !== null}
        payout={dialogPayout}
        isSubmitting={markPaidMutation.isPending}
        errorMessage={dialogError}
        fieldErrors={fieldErrors}
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />
    </div>
  );
}
