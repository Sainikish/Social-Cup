import { Button } from '../../../components';
import type { RedemptionOutcome } from '../types';
import styles from './RedemptionResultCard.module.css';

export interface RedemptionResultCardProps {
  outcome: RedemptionOutcome;
  onScanNext: () => void;
}

// Pure display component - no hooks, no network calls (mirrors the mobile
// app's SubscriptionStatusCard convention). The green/red distinction is the
// one thing this whole screen exists to make unmistakable at a glance.
export function RedemptionResultCard({ outcome, onScanNext }: RedemptionResultCardProps) {
  if (outcome.status === 'success') {
    const { data } = outcome;
    return (
      <div className={`${styles.card} ${styles.success}`} role="status">
        <p className={styles.icon} aria-hidden="true">
          ✓
        </p>
        <h1 className={styles.title}>Redemption Successful</h1>
        <dl className={styles.details}>
          <div className={styles.row}>
            <dt className={styles.label}>Drink</dt>
            <dd className={styles.value}>{data.drinkName}</dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.label}>Credits Used</dt>
            <dd className={styles.value}>{data.creditsDeducted}</dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.label}>Member</dt>
            <dd className={styles.value}>{data.memberFirstName}</dd>
          </div>
        </dl>
        <Button label="Scan Next" onClick={onScanNext} className={styles.button} />
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles.failure}`} role="alert">
      <p className={styles.icon} aria-hidden="true">
        ✕
      </p>
      <h1 className={styles.title}>Redemption Failed</h1>
      <p className={styles.message}>{outcome.message}</p>
      <Button label="Scan Next" onClick={onScanNext} className={styles.button} />
    </div>
  );
}
