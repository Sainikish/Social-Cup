import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { Card, ErrorState, Input, LoadingState, Pagination, Button } from '../../components';
import { memberErrorMessage, useMemberSearchQuery, type MemberSearchParams, type MemberStatus } from '../../features/members';
import styles from './MemberLookup.module.css';

const PAGE_SIZE = 20;
const ALL_STATUSES: MemberStatus[] = ['VISITOR', 'ACTIVE', 'CANCELLED', 'SUSPENDED'];

// Backed by GET /admin/members (search+paginate) and GET /admin/members/{id}
// (row click) - both added alongside this screen. A member's credit balance
// and full detail are shown on MemberDetail after clicking through; this
// screen itself only needs the list-shaped MemberDto fields.
export function MemberLookup() {
  const [queryInput, setQueryInput] = useState('');
  const [statusInput, setStatusInput] = useState<MemberStatus | ''>('');
  const [filters, setFilters] = useState<MemberSearchParams>({});
  const [page, setPage] = useState(0);

  const searchQuery = useMemberSearchQuery({ ...filters, page, size: PAGE_SIZE });

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      q: queryInput.trim() || undefined,
      status: statusInput || undefined,
    });
    setPage(0);
  }

  function handleReset() {
    setQueryInput('');
    setStatusInput('');
    setFilters({});
    setPage(0);
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Members</h1>

      <Card className={styles.filterCard}>
        <h2 className={styles.sectionTitle}>Filters</h2>
        <form className={styles.filterForm} onSubmit={handleFilterSubmit} noValidate>
          <div className={styles.filterRow}>
            <Input
              id="member-search-query"
              label="Search by email or name"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
            />
            <label className={styles.statusLabel} htmlFor="member-search-status">
              <span className={styles.statusLabelText}>Status</span>
              <select
                id="member-search-status"
                className={styles.statusSelect}
                value={statusInput}
                onChange={(event) => setStatusInput(event.target.value as MemberStatus | '')}
              >
                <option value="">Any status</option>
                {ALL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.filterActions}>
            <Button type="submit" label="Search" variant="outline" className={styles.filterButton} />
            <Button
              type="button"
              label="Reset"
              variant="outline"
              className={styles.filterButton}
              onClick={handleReset}
            />
          </div>
        </form>
      </Card>

      {searchQuery.isLoading ? <LoadingState label="Loading members…" /> : null}

      {searchQuery.isError ? (
        <ErrorState
          message={memberErrorMessage(toApiError(searchQuery.error).code)}
          onRetry={() => searchQuery.refetch()}
        />
      ) : null}

      {searchQuery.isSuccess && searchQuery.data.content.length === 0 ? (
        <p className={styles.emptyMessage}>No members matched these filters.</p>
      ) : null}

      {searchQuery.isSuccess && searchQuery.data.content.length > 0 ? (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Email Verified</th>
                  <th>Member Since</th>
                </tr>
              </thead>
              <tbody>
                {searchQuery.data.content.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <Link to={`/members/${member.id}`}>{member.email}</Link>
                    </td>
                    <td>{[member.firstName, member.lastName].filter(Boolean).join(' ') || '—'}</td>
                    <td>{member.status ?? 'Unknown'}</td>
                    <td>{member.emailVerified ? 'Yes' : 'No'}</td>
                    <td>{new Date(member.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={searchQuery.data.page}
            totalPages={searchQuery.data.totalPages}
            first={searchQuery.data.first}
            last={searchQuery.data.last}
            onPageChange={setPage}
            disabled={searchQuery.isFetching}
          />
        </>
      ) : null}
    </div>
  );
}
