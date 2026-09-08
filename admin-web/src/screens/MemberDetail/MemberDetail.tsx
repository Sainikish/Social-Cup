import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { Card, ErrorState } from '../../components';
import {
  MemberActionDialog,
  memberErrorMessage,
  useReactivateMemberMutation,
  useSuspendMemberMutation,
  type MemberAction,
  type MemberDto,
} from '../../features/members';
import styles from './MemberDetail.module.css';

interface MemberDetailLocationState {
  member?: MemberDto;
}

// There is no backend endpoint to look up a member by ID at all - not even
// a public one (unlike Cafe/Drink, which at least have a public GET for a
// "cold" load). The ONLY way this screen ever learns a member's actual data
// is as the direct result of suspending or reactivating them, carried via
// router state from a just-completed action or held in this screen's own
// local state after one. Arriving here without ever having acted on this
// member leaves everything about them genuinely unknown - this screen says
// so plainly rather than fabricating a status or profile.
export function MemberDetail() {
  const { memberId } = useParams<{ memberId: string }>();
  const location = useLocation();
  const state = location.state as MemberDetailLocationState | null;

  const [latestMember, setLatestMember] = useState<MemberDto | undefined>(state?.member);
  const [actionSucceeded, setActionSucceeded] = useState<MemberAction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<MemberAction | null>(null);
  const [actionError, setActionError] = useState<string | undefined>();

  const suspendMutation = useSuspendMemberMutation();
  const reactivateMutation = useReactivateMemberMutation();
  const isSubmitting = suspendMutation.isPending || reactivateMutation.isPending;

  if (!memberId) {
    return <ErrorState message="No member was specified." />;
  }

  const knownStatus = latestMember?.status ?? null;
  const showSuspendAction = !latestMember || latestMember.status !== 'SUSPENDED';
  const showReactivateAction = !latestMember || latestMember.status === 'SUSPENDED';

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
        <Link to="/members">Members</Link> <span aria-hidden="true">/</span> <span>{memberId}</span>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Member {memberId}</h1>
        {latestMember ? (
          <span className={styles.statusBadge} data-status={latestMember.status ?? 'UNKNOWN'}>
            {latestMember.status ?? 'Unknown'}
          </span>
        ) : (
          <span className={styles.statusBadge} data-status="UNKNOWN">
            Unknown
          </span>
        )}
      </header>

      {latestMember ? (
        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Details</h2>
          <dl className={styles.detailList}>
            <dt>Email</dt>
            <dd>{latestMember.email}</dd>
            <dt>Name</dt>
            <dd>{[latestMember.firstName, latestMember.lastName].filter(Boolean).join(' ') || 'Not provided'}</dd>
            <dt>Roles</dt>
            <dd>{latestMember.roles.join(', ')}</dd>
            <dt>Member since</dt>
            <dd>{new Date(latestMember.createdAt).toLocaleDateString()}</dd>
          </dl>
        </Card>
      ) : (
        <Card className={styles.notice}>
          <p className={styles.noticeText}>
            This member&apos;s details are not available - there is no backend endpoint to look up a member by ID.
            Suspending or reactivating below will show the resulting record, since the backend returns it directly
            from that action.
          </p>
        </Card>
      )}

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
