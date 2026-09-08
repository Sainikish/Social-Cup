import { useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { Button, Card, ErrorState, Input, LoadingState } from '../../components';
import {
  payoutErrorMessage,
  useCalculatePayoutMutation,
  usePayoutsByCafeQuery,
  type PayoutResponse,
} from '../../features/payouts';
import { extractFieldErrors } from '../../utils/errors';
import styles from './CafePayouts.module.css';

interface CafePayoutsLocationState {
  cafeName?: string;
}

function formatPeriodDate(value: string | null): string {
  if (!value) {
    return 'Not set';
  }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

export function CafePayouts() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const location = useLocation();
  const cafeName = (location.state as CafePayoutsLocationState | null)?.cafeName;

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ periodStart?: string; periodEnd?: string }>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [latestCalculated, setLatestCalculated] = useState<PayoutResponse | null>(null);

  const payoutsQuery = usePayoutsByCafeQuery(cafeId);
  const calculateMutation = useCalculatePayoutMutation();

  if (!cafeId) {
    return <ErrorState message="No cafe was specified." />;
  }

  function handleCalculateSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    setLatestCalculated(null);

    const errors: { periodStart?: string; periodEnd?: string } = {};
    if (!periodStart.trim()) {
      errors.periodStart = 'Period start is required.';
    }
    if (!periodEnd.trim()) {
      errors.periodEnd = 'Period end is required.';
    }
    if (periodStart && periodEnd && periodEnd < periodStart) {
      errors.periodEnd = 'Period end cannot be before period start.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    calculateMutation.mutate(
      {
        cafeId: cafeId!,
        request: { periodStart, periodEnd },
      },
      {
        onSuccess: (data) => {
          setLatestCalculated(data);
          setPeriodStart('');
          setPeriodEnd('');
          setFieldErrors({});
        },
        onError: (error) => {
          const apiError = toApiError(error);
          const violations = extractFieldErrors(apiError);
          if (violations.periodStart || violations.periodEnd) {
            setFieldErrors({
              periodStart: violations.periodStart,
              periodEnd: violations.periodEnd,
            });
            return;
          }
          setFormError(payoutErrorMessage(apiError.code));
        },
      }
    );
  }

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/cafes">Cafes</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/cafes/${cafeId}`}>{cafeName ?? cafeId}</Link> <span aria-hidden="true">/</span> <span>Payouts</span>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Payouts</h1>
        <p className={styles.subtitle}>{cafeName ?? `Cafe ${cafeId}`}</p>
      </header>

      <Card className={styles.notice}>
        <p className={styles.noticeText}>
          Payouts are calculated on-demand from historical redemption records for this cafe. No funds are moved directly
          through this screen; this calculates and records the amount owed for offline settlement.
        </p>
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Calculate Payout</h2>
        <form className={styles.form} onSubmit={handleCalculateSubmit} noValidate>
          <div className={styles.dateInputsRow}>
            <Input
              id="periodStart"
              label="Period Start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              errorMessage={fieldErrors.periodStart}
              disabled={calculateMutation.isPending}
            />
            <Input
              id="periodEnd"
              label="Period End"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              errorMessage={fieldErrors.periodEnd}
              disabled={calculateMutation.isPending}
            />
          </div>

          <div className={styles.formActions}>
            <Button
              type="submit"
              label={calculateMutation.isPending ? 'Calculating…' : 'Calculate Payout'}
              disabled={calculateMutation.isPending}
            />
          </div>

          {formError ? (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          ) : null}

          {latestCalculated ? (
            <p className={styles.successMessage} role="status">
              Payout recorded: ${latestCalculated.amountOwed.toFixed(2)} owed across{' '}
              {latestCalculated.totalRedemptions} redemption(s) ({latestCalculated.totalCredits} credits).
            </p>
          ) : null}
        </form>
      </Card>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Payout History</h2>

        {payoutsQuery.isLoading ? <LoadingState label="Loading payouts…" /> : null}

        {payoutsQuery.isError ? (
          <ErrorState
            message={payoutErrorMessage(toApiError(payoutsQuery.error).code)}
            onRetry={() => payoutsQuery.refetch()}
          />
        ) : null}

        {payoutsQuery.isSuccess && payoutsQuery.data.length === 0 ? (
          <p className={styles.emptyMessage}>No payouts recorded for this cafe yet.</p>
        ) : null}

        {payoutsQuery.isSuccess && payoutsQuery.data.length > 0 ? (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Redemptions</th>
                  <th>Credits</th>
                  <th>Amount Owed</th>
                  <th>Payment Status</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {payoutsQuery.data.map((payout) => (
                  <tr key={payout.id}>
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
                        <span className={styles.unpaidBadge}>Unpaid</span>
                      )}
                    </td>
                    <td>{payout.paymentReference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
