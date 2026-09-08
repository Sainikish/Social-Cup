import { useState, type FormEvent } from 'react';

import { Button, Input } from '../../../components';
import type { CafeFormValues } from '../formValues';
import styles from './CafeForm.module.css';

export interface CafeFormProps {
  initialValues: CafeFormValues;
  onSubmit: (values: CafeFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  formError?: string;
  fieldErrors?: Record<string, string>;
  // Controls the Payout rate field's hint text. false only when this cafe
  // was loaded from the public cafe endpoint (which has no payoutRate) and
  // no fresher admin response is held - see CafeDetail.tsx.
  payoutRateKnown: boolean;
}

export function CafeForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  formError,
  fieldErrors = {},
  payoutRateKnown,
}: CafeFormProps) {
  const [values, setValues] = useState(initialValues);
  const [syncedInitialValues, setSyncedInitialValues] = useState(initialValues);

  // Re-syncs when the caller supplies a new baseline - e.g. CafeDetail
  // replaces initialValues once an update/status-change response resolves.
  // Adjusts state during render (React's recommended pattern for this)
  // rather than in an effect, which would cause an extra render pass.
  if (initialValues !== syncedInitialValues) {
    setSyncedInitialValues(initialValues);
    setValues(initialValues);
  }

  function set<K extends keyof CafeFormValues>(key: K, value: CafeFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Input
        id="cafe-name"
        label="Name"
        value={values.name}
        onChange={(event) => set('name', event.target.value)}
        errorMessage={fieldErrors.name}
        disabled={isSubmitting}
      />
      <Input
        id="cafe-address"
        label="Address"
        value={values.address}
        onChange={(event) => set('address', event.target.value)}
        errorMessage={fieldErrors.address}
        disabled={isSubmitting}
      />
      <Input
        id="cafe-neighbourhood"
        label="Neighbourhood (optional)"
        value={values.neighbourhood}
        onChange={(event) => set('neighbourhood', event.target.value)}
        errorMessage={fieldErrors.neighbourhood}
        disabled={isSubmitting}
      />

      <div className={styles.row}>
        <Input
          id="cafe-latitude"
          label="Latitude (optional)"
          inputMode="decimal"
          value={values.latitude}
          onChange={(event) => set('latitude', event.target.value)}
          errorMessage={fieldErrors.latitude}
          disabled={isSubmitting}
        />
        <Input
          id="cafe-longitude"
          label="Longitude (optional)"
          inputMode="decimal"
          value={values.longitude}
          onChange={(event) => set('longitude', event.target.value)}
          errorMessage={fieldErrors.longitude}
          disabled={isSubmitting}
        />
      </div>

      <Input
        id="cafe-phone"
        label="Phone number (optional)"
        value={values.phoneNumber}
        onChange={(event) => set('phoneNumber', event.target.value)}
        errorMessage={fieldErrors.phoneNumber}
        disabled={isSubmitting}
      />
      <Input
        id="cafe-email"
        label="Email (optional)"
        type="email"
        value={values.email}
        onChange={(event) => set('email', event.target.value)}
        errorMessage={fieldErrors.email}
        disabled={isSubmitting}
      />
      <Input
        id="cafe-website"
        label="Website (optional)"
        value={values.website}
        onChange={(event) => set('website', event.target.value)}
        errorMessage={fieldErrors.website}
        disabled={isSubmitting}
      />
      <Input
        id="cafe-payout-rate"
        label={
          payoutRateKnown
            ? 'Payout rate (optional, 0.0-1.0)'
            : 'Payout rate (0.0-1.0) - not returned by the public cafe endpoint; leave blank to keep it unchanged'
        }
        inputMode="decimal"
        value={values.payoutRate}
        onChange={(event) => set('payoutRate', event.target.value)}
        errorMessage={fieldErrors.payoutRate}
        disabled={isSubmitting}
      />

      <label className={styles.checkboxRow} htmlFor="cafe-featured">
        <input
          id="cafe-featured"
          type="checkbox"
          checked={values.featured}
          onChange={(event) => set('featured', event.target.checked)}
          disabled={isSubmitting}
        />
        <span>Featured</span>
      </label>

      <Input
        id="cafe-vibe-tags"
        label="Vibe tags (optional)"
        value={values.vibeTags}
        onChange={(event) => set('vibeTags', event.target.value)}
        errorMessage={fieldErrors.vibeTags}
        disabled={isSubmitting}
      />

      <label className={styles.textareaLabel} htmlFor="cafe-description">
        <span>Description (optional)</span>
        <textarea
          id="cafe-description"
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
