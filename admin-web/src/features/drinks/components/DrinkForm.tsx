import { useState, type FormEvent } from 'react';

import { Button, Input } from '../../../components';
import { CREDIT_VALUE_USD } from '../../../config/billing';
import type { DrinkFormValues } from '../formValues';
import styles from './DrinkForm.module.css';

export interface DrinkFormProps {
  initialValues: DrinkFormValues;
  onSubmit: (values: DrinkFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  formError?: string;
  fieldErrors?: Record<string, string>;
  // The cafe's payoutRate (fraction of the member's dollar payment the cafe
  // is paid, e.g. 0.8 = 80%), needed only for the live pricing summary's
  // cafe-payout/margin rows below. Not part of DrinkFormValues/
  // CreateDrinkRequest - this is cafe context threaded in from wherever the
  // caller already has it (see CafeDetail/DrinkCreate/DrinkDetail), not a
  // drink field. `undefined`/`null` (a "cold" arrival with no cafe context
  // in hand - see DrinkDetail.tsx) simply omits those two rows rather than
  // guessing a rate.
  payoutRate?: number | null;
}

// A drink's credit price is never itself converted to dollars anywhere on
// the backend (DrinkResponse/CreateDrinkRequest carry retailPrice and
// creditPrice as independent fields - see formValues.ts) - every dollar
// figure below is this form's own live, client-side calculation for admin
// visibility only, using this app's own CREDIT_VALUE_USD (see
// config/billing.ts for why that's hardcoded). None of it is submitted.
function computePricingSummary(retailPriceInput: string, creditPriceInput: string, payoutRate?: number | null) {
  const retailPrice = Number(retailPriceInput.trim());
  const creditPrice = Number(creditPriceInput.trim());
  const hasValidInputs =
    retailPriceInput.trim().length > 0 &&
    creditPriceInput.trim().length > 0 &&
    Number.isFinite(retailPrice) &&
    Number.isFinite(creditPrice) &&
    retailPrice >= 0 &&
    creditPrice >= 0;

  if (!hasValidInputs) {
    return null;
  }

  const memberPaysUsd = creditPrice * CREDIT_VALUE_USD;
  const savingsUsd = retailPrice - memberPaysUsd;
  const savingsPct = retailPrice > 0 ? (savingsUsd / retailPrice) * 100 : 0;
  const cafePayoutUsd = payoutRate != null ? memberPaysUsd * payoutRate : null;
  const marginUsd = cafePayoutUsd != null ? memberPaysUsd - cafePayoutUsd : null;

  return { memberPaysUsd, savingsUsd, savingsPct, cafePayoutUsd, marginUsd };
}

function formatUsd(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function DrinkForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  formError,
  fieldErrors = {},
  payoutRate,
}: DrinkFormProps) {
  const [values, setValues] = useState(initialValues);
  const [syncedInitialValues, setSyncedInitialValues] = useState(initialValues);

  // Adjusts state during render (React's recommended pattern) rather than
  // in an effect - see cafes/components/CafeForm.tsx for the same pattern
  // and the lint rule it avoids.
  if (initialValues !== syncedInitialValues) {
    setSyncedInitialValues(initialValues);
    setValues(initialValues);
  }

  function set<K extends keyof DrinkFormValues>(key: K, value: DrinkFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  const pricing = computePricingSummary(values.retailPrice, values.creditPrice, payoutRate);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Input
        id="drink-name"
        label="Name"
        value={values.name}
        onChange={(event) => set('name', event.target.value)}
        errorMessage={fieldErrors.name}
        disabled={isSubmitting}
      />
      <Input
        id="drink-type"
        label="Type (optional)"
        value={values.type}
        onChange={(event) => set('type', event.target.value)}
        errorMessage={fieldErrors.type}
        disabled={isSubmitting}
      />

      <div className={styles.row}>
        <Input
          id="drink-retail-price"
          label="Retail price"
          inputMode="decimal"
          value={values.retailPrice}
          onChange={(event) => set('retailPrice', event.target.value)}
          errorMessage={fieldErrors.retailPrice}
          disabled={isSubmitting}
        />
        <Input
          id="drink-credit-price"
          label="Credit price"
          inputMode="numeric"
          value={values.creditPrice}
          onChange={(event) => set('creditPrice', event.target.value)}
          errorMessage={fieldErrors.creditPrice}
          disabled={isSubmitting}
        />
      </div>

      <div className={styles.pricingSummary} aria-live="polite">
        <h3 className={styles.pricingSummaryTitle}>Pricing breakdown</h3>
        {pricing ? (
          <dl className={styles.pricingGrid}>
            <div className={styles.pricingItem}>
              <dt>Member pays</dt>
              <dd>{formatUsd(pricing.memberPaysUsd)}</dd>
            </div>
            <div className={styles.pricingItem}>
              <dt>Member saves</dt>
              <dd>
                {formatUsd(pricing.savingsUsd)} ({pricing.savingsPct.toFixed(0)}%)
              </dd>
            </div>
            {pricing.cafePayoutUsd != null ? (
              <div className={styles.pricingItem}>
                <dt>Cafe is paid</dt>
                <dd>{formatUsd(pricing.cafePayoutUsd)}</dd>
              </div>
            ) : null}
            {pricing.marginUsd != null ? (
              <div className={styles.pricingItem}>
                <dt>Social Cup margin</dt>
                <dd>{formatUsd(pricing.marginUsd)}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className={styles.pricingPlaceholder}>Enter a retail price and credit price to see the breakdown.</p>
        )}
        {pricing && payoutRate == null ? (
          <p className={styles.pricingNote}>
            This cafe&apos;s payout rate is unknown here - open this drink from its cafe page to also see the cafe
            payout and Social Cup&apos;s margin.
          </p>
        ) : null}
      </div>

      <label className={styles.checkboxRow} htmlFor="drink-signature">
        <input
          id="drink-signature"
          type="checkbox"
          checked={values.signature}
          onChange={(event) => set('signature', event.target.checked)}
          disabled={isSubmitting}
        />
        <span>Signature drink</span>
      </label>

      <label className={styles.textareaLabel} htmlFor="drink-description">
        <span>Description (optional)</span>
        <textarea
          id="drink-description"
          className={styles.textarea}
          value={values.description}
          onChange={(event) => set('description', event.target.value)}
          disabled={isSubmitting}
        />
      </label>

      {formError ? (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      ) : null}

      <Button type="submit" label={submitLabel} loading={isSubmitting} disabled={isSubmitting} />
    </form>
  );
}
