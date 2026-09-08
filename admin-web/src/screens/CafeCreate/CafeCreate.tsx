import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { toApiError } from '../../api/client';
import {
  CafeForm,
  EMPTY_CAFE_FORM_VALUES,
  cafeErrorMessage,
  toCafeRequestPayload,
  useCreateCafeMutation,
  validateCafeForm,
  type CafeFormValues,
} from '../../features/cafes';
import { extractFieldErrors } from '../../utils/errors';
import styles from './CafeCreate.module.css';

export function CafeCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateCafeMutation();
  const [formError, setFormError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(values: CafeFormValues) {
    setFormError(undefined);

    const validationErrors = validateCafeForm(values);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    createMutation.mutate(toCafeRequestPayload(values), {
      onSuccess: (data) => {
        // Carries the full AdminCafeDetailResponse (including payoutRate)
        // straight to the Edit screen via router state, so it does not need
        // to re-fetch the public (payoutRate-less) detail response right
        // after creation.
        navigate(`/cafes/${data.id}`, { replace: true, state: { adminDetail: data } });
      },
      onError: (error) => {
        const apiError = toApiError(error);
        const violations = extractFieldErrors(apiError);
        if (Object.keys(violations).length > 0) {
          setFieldErrors(violations);
          return;
        }
        setFormError(cafeErrorMessage(apiError.code));
      },
    });
  }

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/cafes">Cafes</Link> <span aria-hidden="true">/</span> <span>New Cafe</span>
      </nav>
      <h1 className={styles.title}>Create Cafe</h1>

      <CafeForm
        initialValues={EMPTY_CAFE_FORM_VALUES}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        submitLabel="Create Cafe"
        formError={formError}
        fieldErrors={fieldErrors}
        payoutRateKnown
      />
    </div>
  );
}
