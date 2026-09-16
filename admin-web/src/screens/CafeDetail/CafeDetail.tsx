import { useRef, useState, type ChangeEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { Button, Card, ErrorState, LoadingState } from '../../components';
import { config } from '../../config/env';
import {
  CafeForm,
  CafePinResetDialog,
  CafeStatusDialog,
  cafeErrorMessage,
  cafeFormValuesFromDetail,
  preservedHoursAndPhotos,
  toCafeRequestPayload,
  useAddCafePhotoMutation,
  useAdminCafeDetailQuery,
  useRemoveCafePhotoMutation,
  useResetCafePinMutation,
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

// Two arrival paths, both yielding the same AdminCafeDetailResponse shape
// (payoutRate always known):
//  1. Fresh from Create (or a just-completed Edit/status change): already
//     in hand, carried via router state or held in local state after a
//     mutation.
//  2. "Cold": arrived via the admin cafe list or a typed ID with nothing in
//     router state - fetched via GET /admin/cafes/{id}, which (unlike the
//     old public-endpoint fallback this replaced) finds a cafe regardless
//     of status, so an archived cafe reached from the admin list is never
//     a dead end here.
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
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [pinError, setPinError] = useState<string | undefined>();
  const [revealedPin, setRevealedPin] = useState<string | null>(null);

  const adminDetailQuery = useAdminCafeDetailQuery(id, { skip: Boolean(latestAdminDetail) });
  const updateMutation = useUpdateCafeMutation();
  const statusMutation = useUpdateCafeStatusMutation();
  const addPhotoMutation = useAddCafePhotoMutation();
  const removePhotoMutation = useRemoveCafePhotoMutation();
  const resetPinMutation = useResetCafePinMutation();

  if (!id) {
    return <ErrorState message="No cafe was specified." />;
  }

  if (!latestAdminDetail && adminDetailQuery.isLoading) {
    return <LoadingState label="Loading cafe…" />;
  }

  if (!latestAdminDetail && adminDetailQuery.isError) {
    const apiError = toApiError(adminDetailQuery.error);
    return (
      <ErrorState message={cafeErrorMessage(apiError.code)} onRetry={() => adminDetailQuery.refetch()} />
    );
  }

  const detail = latestAdminDetail ?? adminDetailQuery.data;
  if (!detail) {
    return <ErrorState message="This cafe could not be found." />;
  }

  const primaryPhoto = detail.photos.find((photo) => photo.isPrimary) ?? detail.photos[0];
  // barista-web's LoginScreen does not currently read a `cafe` query param
  // to pre-select a cafe (checked LoginScreen.tsx/features/cafeLogin - it
  // only offers a manual CafeSearchSelect combobox), so this link does not
  // yet skip that step. It is included anyway, harmlessly ignored today, so
  // that adding pre-fill support to barista-web later needs no change here.
  // null when VITE_BARISTA_WEB_URL isn't configured for this deployment -
  // the section below hides the link (and only the link) rather than this
  // screen, or the app, failing to render at all.
  const scanLink = config.baristaWebUrl ? `${config.baristaWebUrl}/login?cafe=${detail.id}` : null;
  const initialValues: CafeFormValues = {
    ...cafeFormValuesFromDetail(detail),
    payoutRate: detail.payoutRate != null ? String(detail.payoutRate) : '',
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

  function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Always clear the input's own value, success or failure - otherwise
    // selecting the exact same file again wouldn't re-fire onChange.
    event.target.value = '';
    if (!file) {
      return;
    }

    setPhotoError(undefined);
    addPhotoMutation.mutate(
      { cafeId: id!, file },
      {
        // Only latestAdminDetail is merged here - if it's unset, `detail`
        // is coming from adminDetailQuery instead, which the mutation's own
        // onSuccess already invalidates so React Query refetches it with
        // the new photo included.
        onSuccess: (newPhoto) => {
          setLatestAdminDetail((current) =>
            current ? { ...current, photos: [...current.photos, newPhoto] } : current
          );
        },
        onError: (error) => setPhotoError(cafeErrorMessage(toApiError(error).code)),
      }
    );
  }

  function handleRemovePhoto(photoId: string) {
    setPhotoError(undefined);
    setRemovingPhotoId(photoId);
    removePhotoMutation.mutate(
      { cafeId: id!, photoId },
      {
        onSuccess: () => {
          setLatestAdminDetail((current) => {
            if (!current) {
              return current;
            }
            const removed = current.photos.find((photo) => photo.id === photoId);
            const remaining = current.photos.filter((photo) => photo.id !== photoId);
            if (removed?.isPrimary && remaining.length > 0 && !remaining.some((photo) => photo.isPrimary)) {
              remaining[0] = { ...remaining[0], isPrimary: true };
            }
            return { ...current, photos: remaining };
          });
          setRemovingPhotoId(null);
        },
        onError: (error) => {
          setPhotoError(cafeErrorMessage(toApiError(error).code));
          setRemovingPhotoId(null);
        },
      }
    );
  }

  function handleResetPin() {
    setPinError(undefined);
    resetPinMutation.mutate(id!, {
      onSuccess: (data) => setRevealedPin(data.pin),
      onError: (error) => setPinError(cafeErrorMessage(toApiError(error).code)),
    });
  }

  function handleDismissPin() {
    setRevealedPin(null);
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

      {primaryPhoto ? (
        <img
          src={primaryPhoto.photoUrl}
          alt={primaryPhoto.caption ?? detail.name}
          className={styles.photo}
        />
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Photos</h2>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoSelected}
          disabled={addPhotoMutation.isPending}
          aria-label="Upload cafe photo"
        />
        {addPhotoMutation.isPending ? <p className={styles.noticeText}>Uploading…</p> : null}
        {photoError ? (
          <p className={styles.formError} role="alert">
            {photoError}
          </p>
        ) : null}
        {detail.photos.length === 0 ? (
          <p className={styles.emptyMessage}>No photos yet.</p>
        ) : (
          <ul className={styles.drinkList}>
            {detail.photos.map((photo) => (
              <li key={photo.id ?? photo.photoUrl} className={styles.drinkListItem}>
                <img src={photo.photoUrl} alt={photo.caption ?? detail.name} className={styles.drinkThumbnail} />
                <span>{photo.isPrimary ? 'Primary' : 'Photo'}</span>
                {photo.id ? (
                  <button
                    type="button"
                    className={styles.statusButton}
                    onClick={() => handleRemovePhoto(photo.id!)}
                    disabled={removingPhotoId === photo.id}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.drinksSectionHeader}>
          <h2 className={styles.sectionTitle}>Drinks</h2>
          <div className={styles.drinkActions}>
            <Button
              label="Add Drink"
              variant="outline"
              onClick={() =>
                navigate(`/cafes/${id}/drinks/new`, {
                  state: { cafeName: detail.name, payoutRate: detail.payoutRate },
                })
              }
            />
            <Link to={`/cafes/${id}/drinks`} state={{ cafeName: detail.name, payoutRate: detail.payoutRate }}>
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
              <li key={drink.id} className={styles.drinkListItem}>
                {drink.photoUrl ? (
                  <img src={drink.photoUrl} alt={drink.name} className={styles.drinkThumbnail} />
                ) : null}
                <span>
                  {drink.name}
                  {drink.signature ? ' (Signature)' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Barista Access</h2>
        <p className={styles.noticeText}>
          Baristas at this cafe log in to the scanner app with this cafe and a shared PIN. There is no admin
          endpoint yet to view whether a PIN already exists - Generate/Reset always issues a brand-new one.
        </p>
        {scanLink ? (
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>Scan / login link</span>
            <code className={styles.scanLink}>{scanLink}</code>
          </div>
        ) : null}
        <div className={styles.statusActions}>
          <Button label="Generate / Reset PIN" variant="outline" onClick={handleResetPin} loading={resetPinMutation.isPending} disabled={resetPinMutation.isPending} />
        </div>
        {pinError ? (
          <p className={styles.formError} role="alert">
            {pinError}
          </p>
        ) : null}
      </section>

      <CafePinResetDialog open={revealedPin != null} pin={revealedPin} onDismiss={handleDismissPin} />

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

      <Card className={styles.notice}>
        <p className={styles.noticeText}>
          Opening hours are not editable on this screen yet - saving changes here keeps them exactly as currently
          stored.
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
          payoutRateKnown
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
