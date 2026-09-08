import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { ErrorState, LoadingState } from '../../components';
import {
  DrinkForm,
  DrinkStatusDialog,
  drinkErrorMessage,
  drinkFormValuesFromResponse,
  toDrinkRequestPayload,
  usePublicDrinkDetailQuery,
  useUpdateDrinkMutation,
  useUpdateDrinkStatusMutation,
  validateDrinkForm,
  type DrinkFormValues,
  type DrinkResponse,
  type DrinkStatus,
} from '../../features/drinks';
import { extractFieldErrors } from '../../utils/errors';
import styles from './DrinkDetail.module.css';

interface DrinkDetailLocationState {
  drink?: DrinkResponse;
  cafeName?: string;
}

const ALL_STATUSES: DrinkStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

// Handles two arrival paths, since there is no admin get-drink-by-id
// endpoint to unify them behind:
//  1. Fresh from Create/DrinkList/a just-completed edit or status change:
//     the full DrinkResponse is already in hand via router state or local
//     state after a mutation.
//  2. "Cold": arrived via a typed URL with nothing in router state. Falls
//     back to the public GET /drinks/{id}, which finds ACTIVE and INACTIVE
//     drinks but never an ARCHIVED one (DrinkService.getDrinkById uses
//     findByIdAndArchivedAtIsNull) - archiving a drink is effectively
//     permanent through this app, see DrinkStatusDialog's own warning.
// Unlike Cafe, DrinkResponse is the exact same shape everywhere, so there
// is no "field unknown" gap to surface here - every field is always known
// once any detail response loads.
export function DrinkDetail() {
  const { drinkId } = useParams<{ drinkId: string }>();
  const location = useLocation();
  const state = location.state as DrinkDetailLocationState | null;

  const [latestDrink, setLatestDrink] = useState<DrinkResponse | undefined>(state?.drink);
  const [updateSucceeded, setUpdateSucceeded] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DrinkStatus | null>(null);
  const [statusError, setStatusError] = useState<string | undefined>();
  const [statusSucceeded, setStatusSucceeded] = useState(false);

  const publicDetailQuery = usePublicDrinkDetailQuery(drinkId, { skip: Boolean(latestDrink) });
  const updateMutation = useUpdateDrinkMutation();
  const statusMutation = useUpdateDrinkStatusMutation();

  if (!drinkId) {
    return <ErrorState message="No drink was specified." />;
  }

  if (!latestDrink && publicDetailQuery.isLoading) {
    return <LoadingState label="Loading drink…" />;
  }

  if (!latestDrink && publicDetailQuery.isError) {
    const apiError = toApiError(publicDetailQuery.error);
    return <ErrorState message={drinkErrorMessage(apiError.code)} onRetry={() => publicDetailQuery.refetch()} />;
  }

  const drink = latestDrink ?? publicDetailQuery.data;
  if (!drink) {
    return <ErrorState message="This drink could not be found." />;
  }

  const cafeName = state?.cafeName ?? drink.cafeName ?? undefined;
  const initialValues: DrinkFormValues = drinkFormValuesFromResponse(drink);

  function handleSubmit(values: DrinkFormValues) {
    setFormError(undefined);
    setUpdateSucceeded(false);

    const validationErrors = validateDrinkForm(values);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    updateMutation.mutate(
      { id: drinkId!, request: toDrinkRequestPayload(values) },
      {
        onSuccess: (data) => {
          setLatestDrink(data);
          setUpdateSucceeded(true);
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

  function requestStatusChange(status: DrinkStatus) {
    setStatusError(undefined);
    setStatusSucceeded(false);
    setPendingStatus(status);
    setStatusDialogOpen(true);
  }

  function confirmStatusChange() {
    if (!pendingStatus) {
      return;
    }
    setStatusError(undefined);
    statusMutation.mutate(
      { id: drinkId!, status: pendingStatus },
      {
        onSuccess: (data) => {
          setLatestDrink(data);
          setStatusDialogOpen(false);
          setPendingStatus(null);
          setStatusSucceeded(true);
        },
        onError: (error) => {
          setStatusError(drinkErrorMessage(toApiError(error).code));
        },
      }
    );
  }

  function cancelStatusChange() {
    setStatusDialogOpen(false);
    setPendingStatus(null);
    setStatusError(undefined);
  }

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/cafes">Cafes</Link> <span aria-hidden="true">/</span>{' '}
        {drink.cafeId ? (
          <>
            <Link to={`/cafes/${drink.cafeId}`}>{cafeName ?? drink.cafeId}</Link> <span aria-hidden="true">/</span>{' '}
            <Link to={`/cafes/${drink.cafeId}/drinks`} state={{ cafeName }}>
              Drinks
            </Link>{' '}
            <span aria-hidden="true">/</span>{' '}
          </>
        ) : null}
        <span>{drink.name}</span>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>{drink.name}</h1>
        <span className={styles.statusBadge} data-status={drink.status}>
          {drink.status}
        </span>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Status</h2>
        <div className={styles.statusActions}>
          {ALL_STATUSES.filter((status) => status !== drink.status).map((status) => (
            <button
              key={status}
              type="button"
              className={styles.statusButton}
              onClick={() => requestStatusChange(status)}
              disabled={statusMutation.isPending}
            >
              Set {status}
            </button>
          ))}
        </div>
        {statusSucceeded ? (
          <p className={styles.successMessage} role="status">
            Status updated to {drink.status}.
          </p>
        ) : null}
      </section>

      <DrinkStatusDialog
        open={statusDialogOpen}
        currentStatus={drink.status}
        requestedStatus={pendingStatus}
        isSubmitting={statusMutation.isPending}
        errorMessage={statusError}
        onConfirm={confirmStatusChange}
        onCancel={cancelStatusChange}
      />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Details</h2>
        <DrinkForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
          submitLabel="Save Changes"
          formError={formError}
          fieldErrors={fieldErrors}
        />
        {updateSucceeded ? (
          <p className={styles.successMessage} role="status">
            Drink updated successfully.
          </p>
        ) : null}
      </section>
    </div>
  );
}
