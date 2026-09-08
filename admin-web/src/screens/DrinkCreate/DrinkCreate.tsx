import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { ErrorState } from '../../components';
import {
  DrinkForm,
  EMPTY_DRINK_FORM_VALUES,
  drinkErrorMessage,
  toDrinkRequestPayload,
  useCreateDrinkMutation,
  validateDrinkForm,
  type DrinkFormValues,
} from '../../features/drinks';
import { extractFieldErrors } from '../../utils/errors';
import styles from './DrinkCreate.module.css';

interface DrinkCreateLocationState {
  cafeName?: string;
}

export function DrinkCreate() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const location = useLocation();
  const cafeName = (location.state as DrinkCreateLocationState | null)?.cafeName;
  const navigate = useNavigate();
  const createMutation = useCreateDrinkMutation();
  const [formError, setFormError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!cafeId) {
    return <ErrorState message="No cafe was specified." />;
  }

  function handleSubmit(values: DrinkFormValues) {
    setFormError(undefined);

    const validationErrors = validateDrinkForm(values);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    createMutation.mutate(
      { cafeId: cafeId!, request: toDrinkRequestPayload(values) },
      {
        onSuccess: (data) => {
          // Carries the full DrinkResponse straight to the Detail screen
          // via router state, avoiding a redundant fetch right after
          // creation - mirrors CafeCreate's own navigation pattern.
          navigate(`/drinks/${data.id}`, { replace: true, state: { drink: data, cafeName } });
        },
        onError: (error) => {
          const apiError = toApiError(error);
          const violations = extractFieldErrors(apiError);
          if (Object.keys(violations).length > 0) {
            setFieldErrors(violations);
            return;
          }
          setFormError(drinkErrorMessage(apiError.code));
        },
      }
    );
  }

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/cafes">Cafes</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/cafes/${cafeId}`}>{cafeName ?? cafeId}</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/cafes/${cafeId}/drinks`} state={{ cafeName }}>
          Drinks
        </Link>{' '}
        <span aria-hidden="true">/</span> <span>New Drink</span>
      </nav>
      <h1 className={styles.title}>Add Drink</h1>

      <DrinkForm
        initialValues={EMPTY_DRINK_FORM_VALUES}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        submitLabel="Add Drink"
        formError={formError}
        fieldErrors={fieldErrors}
      />
    </div>
  );
}
