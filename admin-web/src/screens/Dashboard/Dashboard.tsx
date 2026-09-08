import { useNavigate } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button, Card, ErrorState, LoadingState } from '../../components';
import { dashboardMetricsErrorMessage, useDashboardMetricsQuery } from '../../features/dashboardMetrics';
import styles from './Dashboard.module.css';

// Otherwise a placeholder, per Phase 1 scope - the nav links below add no
// card, count, or metric of their own beyond the one Dashboard Metrics
// section (GET /admin/dashboard/metrics); they remain plain navigation
// entries to their own full screens (GET /admin/subscriptions, GET
// /admin/payouts, GET /admin/redemptions and GET /admin/audit-log). Drink
// management is reached via Cafe Detail rather than linked here directly (a
// drink always belongs to a specific cafe). Per-cafe payout calculation is
// likewise reached via Cafe Detail; this link is only for the cross-cafe
// payout list. Member Management (Phase 4) has no list/search to browse
// from here either - see MemberLookup for why.
export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const metricsQuery = useDashboardMetricsQuery();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Social Cup Admin</h1>
        <Button label="Log out" variant="outline" className={styles.logoutButton} onClick={logout} />
      </header>

      <Card className={styles.card}>
        {user ? <p className={styles.signedInAs}>Signed in as {user.email}</p> : null}
        <p className={styles.placeholder}>More of the dashboard is coming in later implementation phases.</p>
        <div className={styles.navButtons}>
          <Button label="Manage Cafes" onClick={() => navigate('/cafes')} className={styles.manageCafesButton} />
          <Button label="Manage Members" onClick={() => navigate('/members')} className={styles.manageCafesButton} />
          <Button
            label="Manage Subscriptions"
            onClick={() => navigate('/subscriptions')}
            className={styles.manageCafesButton}
          />
          <Button label="Manage Payouts" onClick={() => navigate('/payouts')} className={styles.manageCafesButton} />
          <Button
            label="Manage Redemptions"
            onClick={() => navigate('/redemptions')}
            className={styles.manageCafesButton}
          />
          <Button
            label="View Audit Log"
            onClick={() => navigate('/audit-log')}
            className={styles.manageCafesButton}
          />
        </div>
      </Card>

      <Card className={styles.metricsCard}>
        <h2 className={styles.sectionTitle}>Dashboard Metrics</h2>

        {metricsQuery.isLoading ? <LoadingState label="Loading metrics…" /> : null}

        {metricsQuery.isError ? (
          <ErrorState
            message={dashboardMetricsErrorMessage(toApiError(metricsQuery.error).code)}
            onRetry={() => metricsQuery.refetch()}
          />
        ) : null}

        {metricsQuery.isSuccess ? (
          <dl className={styles.metricsGrid}>
            <div className={styles.metricItem}>
              <dt className={styles.metricLabel}>Total Members</dt>
              <dd className={styles.metricValue}>{metricsQuery.data.totalMembers}</dd>
            </div>
            <div className={styles.metricItem}>
              <dt className={styles.metricLabel}>Total Active Cafes</dt>
              <dd className={styles.metricValue}>{metricsQuery.data.totalActiveCafes}</dd>
            </div>
            <div className={styles.metricItem}>
              <dt className={styles.metricLabel}>Total Active Drinks</dt>
              <dd className={styles.metricValue}>{metricsQuery.data.totalActiveDrinks}</dd>
            </div>
            <div className={styles.metricItem}>
              <dt className={styles.metricLabel}>Total Redemptions</dt>
              <dd className={styles.metricValue}>{metricsQuery.data.totalRedemptions}</dd>
            </div>
            <div className={styles.metricItem}>
              <dt className={styles.metricLabel}>Total Credits Redeemed</dt>
              <dd className={styles.metricValue}>{metricsQuery.data.totalCreditsRedeemed}</dd>
            </div>
            <div className={styles.metricItem}>
              <dt className={styles.metricLabel}>Total Payout Amount Owed</dt>
              <dd className={styles.metricValue}>${metricsQuery.data.totalPayoutAmountOwed.toFixed(2)}</dd>
            </div>
            <div className={styles.metricItem}>
              <dt className={styles.metricLabel}>Total Payout Amount Paid</dt>
              <dd className={styles.metricValue}>${metricsQuery.data.totalPayoutAmountPaid.toFixed(2)}</dd>
            </div>
          </dl>
        ) : null}
      </Card>
    </div>
  );
}
