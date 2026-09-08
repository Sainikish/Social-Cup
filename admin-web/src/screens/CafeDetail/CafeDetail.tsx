import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { Button, Card, ErrorState, LoadingState } from '../../components';
import {
  CafeForm,
  CafeStatusDialog,
  cafeErrorMessage,
  cafeFormValuesFromDetail,
  preservedHoursAndPhotos,
  toCafeRequestPayload,
  usePublicCafeDetailQuery,
  useUpdateCafeMutation,
  useUpdateCafeStatusMutation,
  validateCafeForm,
  type AdminCafeDetailResponse,
  type CafeFormValues,
  type CafeStatus,
} from '../../features/cafes';
import { extractFieldErrors } from '../../utils/errors';
import styles from './CafeDetail.module.css';

interface CafeDetailLocationState {
  adminDetail?: AdminCafeDetailResponse;
}

const ALL_STATUSES: CafeStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

// Handles two distinct arrival paths, since there is no admin GET-by-id
// endpoint to unify them behind:
//  1. Fresh from Create (or a just-completed Edit/status change): the full
//     AdminCafeDetailResponse - including payoutRate - is already in hand,
//     carried via router state or held in local state after a mutation.
//  2. "Cold": arrived via search or a typed ID with nothing in router
//     state. Only the public GET /cafes/{id} (CafeDetailResponse) is
//     available, which has every field EXCEPT payoutRate. That gap is
//     surfaced to the admin explicitly (see CafeForm's payoutRateKnown
//     prop) - it is never fabricated or defaulted.
export function CafeDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const adminDetailFromNav = (location.state as CafeDetailLocationState | null)?.adminDetail;

  const [latestAdminDetail, setLatestAdminDetail] = useState<AdminCafeDetailResponse | undefined>(adminDetailFromNav);
  const [updateSucceeded, setUpdateSucceeded] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<CafeStatus | null>(null);
  const [statusError, setStatusError] = useState<string | undefined>();
  const [statusSucceeded, setStatusSucceeded] = useState(false);

  const publicDetailQuery = usePublicCafeDetailQuery(id, { skip: Boolean(latestAdminDetail) });
  const updateMutation = useUpdateCafeMutation();
  const statusMutation = useUpdateCafeStatusMutation();

  if (!id) {
    return <ErrorState message="No cafe was specified." />;
  }

  if (!latestAdminDetail && publicDetailQuery.isLoading) {
    return <LoadingState label="Loading cafe…" />;
  }

  if (!latestAdminDetail && publicDetailQuery.isError) {
    const apiError = toApiError(publicDetailQuery.error);
    return (
      <ErrorState message={cafeErrorMessage(apiError.code)} onRetry={() => publicDetailQuery.refetch()} />
    );
  }

  const detail = latestAdminDetail ?? publicDetailQuery.data;
  if (!detail) {
    return <ErrorState message="This cafe could not be found." />;
  }

  const payoutRateKnown = Boolean(latestAdminDetail);
  const initialValues: CafeFormValues = {
    ...cafeFormValuesFromDetail(detail),
    payoutRate: latestAdminDetail?.payoutRate != null ? String(latestAdminDetail.payoutRate) : '',
  };

  function handleSubmit(values: CafeFormValues) {
    setFormError(undefined);
    setUpdateSucceeded(false);

    const validationErrors = validateCafeForm(values);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const payload = {
      ...toCafeRequestPayload(values),
      ...preservedHoursAndPhotos(detail!),
    };

    updateMutation.mutate(
      { id: id!, request: payload },
      {
        onSuccess: (data) => {
          setLatestAdminDetail(data);
          setUpdateSucceeded(true);
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
      }
    );
  }

  function requestStatusChange(status: CafeStatus) {
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
      { id: id!, status: pendingStatus },
      {
        onSuccess: (data) => {
          setLatestAdminDetail(data);
          setStatusDialogOpen(false);
          setPendingStatus(null);
          setStatusSucceeded(true);
        },
        onError: (error) => {
          setStatusError(cafeErrorMessage(toApiError(error).code));
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
        <Link to="/cafes">Cafes</Link> <span aria-hidden="true">/</span> <span>{detail.name}</span>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>{detail.name}</h1>
        <span className={styles.statusBadge} data-status={detail.status}>
          {detail.status}
        </span>
      </header>

      <section className={styles.section}>
        <div className={styles.drinksSectionHeader}>
          <h2 className={styles.sectionTitle}>Drinks</h2>
          <div className={styles.drinkActions}>
            <Button
              label="Add Drink"
              variant="outline"
              onClick={() => navigate(`/cafes/${id}/drinks/new`, { state: { cafeName: detail.name } })}
            />
            <Link to={`/cafes/${id}/drinks`} state={{ cafeName: detail.name }}>
              Manage Drinks
            </Link>
          </div>
        </div>
        <p className={styles.noticeText}>
          Showing this cafe&apos;s <strong>active drinks only</strong> - inactive/archived drinks are not listed
          here or in Manage Drinks (no admin drink-list endpoint exists yet).
        </p>
        {detail.drinks.length === 0 ? (
          <p className={styles.emptyMessage}>No active drinks at this cafe yet.</p>
        ) : (
          <ul className={styles.drinkList}>
            {detail.drinks.map((drink) => (
              <li key={drink.id}>
                {drink.name}
                {drink.signature ? ' (Signature)' : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.drinksSectionHeader}>
          <h2 className={styles.sectionTitle}>Payouts</h2>
          <div className={styles.drinkActions}>
            <Button
              label="Manage Payouts"
              variant="outline"
              onClick={() => navigate(`/cafes/${id}/payouts`, { state: { cafeName: detail.name } })}
            />
          </div>
        </div>
        <p className={styles.noticeText}>
          Calculate on-demand payouts and view payment reconciliation history for this cafe.
        </p>
      </section>

      {!payoutRateKnown ? (
        <Card className={styles.notice}>
          <p className={styles.noticeText}>
            This cafe&apos;s <strong>payout rate</strong> is not shown - it was loaded from the public cafe
            endpoint, which does not return it. Leave that field blank to keep the current value unchanged, or
            enter a new value to set it.
          </p>
        </Card>
      ) : null}

      <Card className={styles.notice}>
        <p className={styles.noticeText}>
          Opening hours and photos are not editable on this screen yet - saving changes here keeps them exactly
          as currently stored.
        </p>
      </Card>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Status</h2>
        <div className={styles.statusActions}>
          {ALL_STATUSES.filter((status) => status !== detail.status).map((status) => (
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
            Status updated to {detail.status}.
          </p>
        ) : null}
      </section>

      <CafeStatusDialog
        open={statusDialogOpen}
        currentStatus={detail.status}
        requestedStatus={pendingStatus}
        isSubmitting={statusMutation.isPending}
        errorMessage={statusError}
        onConfirm={confirmStatusChange}
        onCancel={cancelStatusChange}
      />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Details</h2>
        <CafeForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
          submitLabel="Save Changes"
          formError={formError}
          fieldErrors={fieldErrors}
          payoutRateKnown={payoutRateKnown}
        />
        {updateSucceeded ? (
          <p className={styles.successMessage} role="status">
            Cafe updated successfully.
          </p>
        ) : null}
      </section>
    </div>
  );
}
