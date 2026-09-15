import { Link } from 'react-router-dom';

import { Card } from '../../components';
import { CREDIT_VALUE_USD, MEMBERSHIP_PLAN } from '../../config/billing';
import styles from './Settings.module.css';

// Per PRD Module 9.2. Both sections below are read-only: neither has a
// backend settings/config endpoint to read from or write to (checked
// AdminCafeController/AdminDrinkController and the credit package - no such
// endpoint or persisted config exists anywhere in the backend), so this
// screen cannot let an admin edit these values, only see what this app
// currently assumes/mirrors (see src/config/billing.ts for the constants
// themselves and why they are hardcoded).
export function Settings() {
  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/dashboard">Dashboard</Link> <span aria-hidden="true">/</span> <span>Settings</span>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </header>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Credit Value</h2>
        <p className={styles.noticeText}>
          The dollar value of one credit, used everywhere this app converts a credit price into a member-facing
          dollar amount.
        </p>
        <dl className={styles.settingsGrid}>
          <div className={styles.settingItem}>
            <dt className={styles.settingLabel}>1 credit is worth</dt>
            <dd className={styles.settingValue}>${CREDIT_VALUE_USD.toFixed(2)}</dd>
          </div>
        </dl>
        <p className={styles.readOnlyNote}>
          Read-only - this is currently a fixed value hardcoded in this app, not a setting stored on the backend.
          There is no admin API yet to configure it.
        </p>
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Membership Plan</h2>
        <p className={styles.noticeText}>The Social Cup membership plan members subscribe to via Stripe.</p>
        <dl className={styles.settingsGrid}>
          <div className={styles.settingItem}>
            <dt className={styles.settingLabel}>Monthly price</dt>
            <dd className={styles.settingValue}>${MEMBERSHIP_PLAN.monthlyPriceUsd.toFixed(2)}/mo</dd>
          </div>
          <div className={styles.settingItem}>
            <dt className={styles.settingLabel}>Credits per month</dt>
            <dd className={styles.settingValue}>{MEMBERSHIP_PLAN.creditsPerMonth} credits</dd>
          </div>
        </dl>
        <p className={styles.readOnlyNote}>
          Read-only - this plan is actually controlled in Stripe, not in this app. These numbers are a manually
          kept mirror of Stripe&apos;s dashboard config: if the plan ever changes in Stripe, this display must be
          updated to match.
        </p>
      </Card>
    </div>
  );
}
