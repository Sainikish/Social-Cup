import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { Card, ErrorState, LoadingState } from '../../components';
import {
  MemberActionDialog,
  memberErrorMessage,
  useMemberByIdQuery,
  useMemberCreditBalanceQuery,
  useReactivateMemberMutation,
  useSuspendMemberMutation,
  type MemberAction,
  type MemberDto,
} from '../../features/members';
import styles from './MemberDetail.module.css';

interface MemberDetailLocationState {
  member?: MemberDto;
}

// Two arrival paths, same convention as CafeDetail/DrinkDetail: "fresh" via
// router state (right after a suspend/reactivate action, or a row click from
// MemberLookup that already fetched the full page) or "cold" via
// GET /admin/members/{id} - added alongside this screen, so a typed/bookmarked
// URL or a page refresh no longer leaves this screen with nothing to show.
export function MemberDetail() {
  const { memberId } = useParams<{ memberId: string }>();
  const location = useLocation();
  const state = location.state as MemberDetailLocationState | null;

  const [latestMember, setLatestMember] = useState<MemberDto | undefined>(state?.member);
  const [actionSucceeded, setActionSucceeded] = useState<MemberAction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<MemberAction | null>(null);
  const [actionError, setActionError] = useState<string | undefined>();

  const memberQuery = useMemberByIdQuery(memberId, { skip: Boolean(latestMember) });
  const creditQuery = useMemberCreditBalanceQuery(memberId);
  const suspendMutation = useSuspendMemberMutation();
  const reactivateMutation = useReactivateMemberMutation();
  const isSubmitting = suspendMutation.isPending || reactivateMutation.isPending;

  if (!memberId) {
    return <ErrorState message="No member was specified." />;
  }

  if (!latestMember && memberQuery.isLoading) {
    return <LoadingState label="Loading member…" />;
  }

  if (!latestMember && memberQuery.isError) {
    return (
      <ErrorState
        message={memberErrorMessage(toApiError(memberQuery.error).code)}
        onRetry={() => memberQuery.refetch()}
      />
    );
  }

  const member = latestMember ?? memberQuery.data;
  const knownStatus = member?.status ?? null;
  const showSuspendAction = !member || member.status !== 'SUSPENDED';
  const showReactivateAction = !member || member.status === 'SUSPENDED';

  function requestAction(action: MemberAction) {
    setActionError(undefined);
    setActionSucceeded(null);
    setPendingAction(action);
    setDialogOpen(true);
  }

  function confirmAction() {
    if (!pendingAction || isSubmitting) {
      return;
    }
    setActionError(undefined);
    const mutation = pendingAction === 'SUSPEND' ? suspendMutation : reactivateMutation;
    const completedAction = pendingAction;

    mutation.mutate(memberId!, {
      onSuccess: (data) => {
        setLatestMember(data);
        setDialogOpen(false);
        setPendingAction(null);
        setActionSucceeded(completedAction);
      },
      onError: (error) => {
        setActionError(memberErrorMessage(toApiError(error).code));
      },
    });
  }

  function cancelAction() {
    setDialogOpen(false);
    setPendingAction(null);
    setActionError(undefined);
  }

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/members">Members</Link> <span aria-hidden="true">/</span>{' '}
        <span>{member?.email ?? memberId}</span>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>{member?.email ?? `Member ${memberId}`}</h1>
        <span className={styles.statusBadge} data-status={member?.status ?? 'UNKNOWN'}>
          {member?.status ?? 'Unknown'}
        </span>
      </header>

      {member ? (
        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Details</h2>
          <dl className={styles.detailList}>
            <dt>Email</dt>
            <dd>{member.email}</dd>
            <dt>Name</dt>
            <dd>{[member.firstName, member.lastName].filter(Boolean).join(' ') || 'Not provided'}</dd>
            <dt>Roles</dt>
            <dd>{member.roles.join(', ')}</dd>
            <dt>Email verified</dt>
            <dd>{member.emailVerified ? 'Yes' : 'No'}</dd>
            <dt>Member since</dt>
            <dd>{new Date(member.createdAt).toLocaleDateString()}</dd>
          </dl>
        </Card>
      ) : null}

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Credit Balance</h2>
        {creditQuery.isLoading ? <p className={styles.noticeText}>Loading…</p> : null}
        {creditQuery.isError ? (
          <p className={styles.noticeText}>
            {memberErrorMessage(toApiError(creditQuery.error).code)}
          </p>
        ) : null}
        {creditQuery.isSuccess ? (
          <p className={styles.noticeText}>{creditQuery.data.balance} credits</p>
        ) : null}
      </Card>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Actions</h2>
        <div className={styles.actionButtons}>
          {showSuspendAction ? (
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => requestAction('SUSPEND')}
              disabled={isSubmitting}
            >
              Suspend Member
            </button>
          ) : null}
          {showReactivateAction ? (
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => requestAction('REACTIVATE')}
              disabled={isSubmitting}
            >
              Reactivate Member
            </button>
          ) : null}
        </div>
        {actionSucceeded ? (
          <p className={styles.successMessage} role="status">
            Member {actionSucceeded === 'SUSPEND' ? 'suspended' : 'reactivated'} successfully.
          </p>
        ) : null}
      </section>

      <MemberActionDialog
        open={dialogOpen}
        action={pendingAction}
        memberId={memberId}
        knownStatus={knownStatus}
        isSubmitting={isSubmitting}
        errorMessage={actionError}
        onConfirm={confirmAction}
        onCancel={cancelAction}
      />
    </div>
  );
}
