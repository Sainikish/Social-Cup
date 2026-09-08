import { useState, type FormEvent } from 'react';

import { Button, Input } from '../../../components';
import type { DrinkFormValues } from '../formValues';
import styles from './DrinkForm.module.css';

export interface DrinkFormProps {
  initialValues: DrinkFormValues;
  onSubmit: (values: DrinkFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  formError?: string;
  fieldErrors?: Record<string, string>;
}

export function DrinkForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  formError,
  fieldErrors = {},
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

      <Input
        id="drink-photo-url"
        label="Photo URL (optional)"
        value={values.photoUrl}
        onChange={(event) => set('photoUrl', event.target.value)}
        errorMessage={fieldErrors.photoUrl}
        disabled={isSubmitting}
      />

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
