import { toApiError } from '../../api/client';
import { Card, ErrorState, LoadingState } from '../../components';
import { subscriptionErrorMessage, useAdminSubscriptions } from '../../features/subscriptions';
import styles from './SubscriptionList.module.css';

// Renders a LocalDate string ("YYYY-MM-DD", no time/timezone component) by
// constructing a Date from its local year/month/day parts - re-parsing it
// via `new Date(dateString)` would treat it as UTC midnight and could
// display the wrong calendar day depending on the viewer's timezone.
function formatPeriodDate(value: string | null): string {
  if (!value) {
    return 'Not set';
  }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

// GET /admin/subscriptions returns a flat, unpaginated array with no
// query parameters - this screen reflects that honestly: no pagination
// controls, no search box, no status filter, no cancel/reactivate actions
// (no such endpoint exists for admins). See README.md for the full list of
// backend limitations this phase deliberately does not work around.
export function SubscriptionList() {
  const subscriptionsQuery = useAdminSubscriptions();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Subscriptions</h1>

      <Card className={styles.notice}>
        <p className={styles.noticeText}>
          This is a read-only view of every subscription the backend returns - there is no pagination, search, or
          status filter on this endpoint, and no admin cancellation endpoint exists. Stripe identifiers are not
          exposed here.
        </p>
      </Card>

      {subscriptionsQuery.isLoading ? <LoadingState label="Loading subscriptions…" /> : null}

      {subscriptionsQuery.isError ? (
        <ErrorState
          message={subscriptionErrorMessage(toApiError(subscriptionsQuery.error).code)}
          onRetry={() => subscriptionsQuery.refetch()}
        />
      ) : null}

      {subscriptionsQuery.isSuccess && subscriptionsQuery.data.length === 0 ? (
        <p className={styles.emptyMessage}>No subscriptions found.</p>
      ) : null}

      {subscriptionsQuery.isSuccess && subscriptionsQuery.data.length > 0 ? (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Status</th>
                <th>Current Period</th>
                <th>Cancel at Period End</th>
                <th>Payment Failures</th>
              </tr>
            </thead>
            <tbody>
              {subscriptionsQuery.data.map((subscription) => (
                <tr key={subscription.subscriptionId}>
                  <td>
                    <div className={styles.memberCell}>
                      <span className={styles.memberEmail}>{subscription.memberEmail}</span>
                      <span className={styles.memberId}>{subscription.memberId}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.statusBadge} data-status={subscription.status}>
                      {subscription.status}
                    </span>
                  </td>
                  <td className={styles.periodCell}>
                    {formatPeriodDate(subscription.currentPeriodStart)} - {formatPeriodDate(subscription.currentPeriodEnd)}
                  </td>
                  <td>{subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}</td>
                  <td>{subscription.paymentFailedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
