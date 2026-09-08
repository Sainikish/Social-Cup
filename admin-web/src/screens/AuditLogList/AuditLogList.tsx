import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { Button, Card, ErrorState, Input, LoadingState, Pagination } from '../../components';
import { auditLogErrorMessage, useAuditLogQuery, type AuditLogFilters } from '../../features/auditLog';
import styles from './AuditLogList.module.css';

const PAGE_SIZE = 20;
type SortOrder = 'createdAt,desc' | 'createdAt,asc';

// Read-only admin audit trail, backed by GET /admin/audit-log. Every value
// shown - action, entityType, entityId, oldValues, newValues, created date -
// is exactly what the backend returns; oldValues/newValues are rendered
// verbatim (never parsed, reformatted, or recalculated), and there is no
// edit/delete action here or anywhere else for an audit log entry. The actor
// column links to the existing member detail screen only when actorId is
// present - actorId/actorEmail are both null when the acting member has
// since been deleted, and that is shown honestly rather than fabricated.
export function AuditLogList() {
  const [actorIdInput, setActorIdInput] = useState('');
  const [entityTypeInput, setEntityTypeInput] = useState('');
  const [entityIdInput, setEntityIdInput] = useState('');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [sort, setSort] = useState<SortOrder>('createdAt,desc');
  const [dateRangeError, setDateRangeError] = useState<string | undefined>();

  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(0);

  const auditLogQuery = useAuditLogQuery({ ...filters, page, size: PAGE_SIZE, sort });

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDateRangeError(undefined);

    if (fromInput && toInput && toInput < fromInput) {
      setDateRangeError('"To" cannot be before "From".');
      return;
    }

    setFilters({
      actorId: actorIdInput.trim() || undefined,
      entityType: entityTypeInput.trim() || undefined,
      entityId: entityIdInput.trim() || undefined,
      from: fromInput || undefined,
      to: toInput || undefined,
    });
    setPage(0);
  }

  function handleReset() {
    setActorIdInput('');
    setEntityTypeInput('');
    setEntityIdInput('');
    setFromInput('');
    setToInput('');
    setDateRangeError(undefined);
    setFilters({});
    setPage(0);
  }

  function handleSortChange(value: SortOrder) {
    setSort(value);
    setPage(0);
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Audit Log</h1>

      <Card className={styles.notice}>
        <p className={styles.noticeText}>
          Read-only administrative audit trail from <code>GET /admin/audit-log</code>. Every value shown -
          including <code>oldValues</code> and <code>newValues</code> - is exactly what the backend returns; there
          is no edit, delete, or other mutation action on this screen.
        </p>
      </Card>

      <Card className={styles.filterCard}>
        <h2 className={styles.sectionTitle}>Filters</h2>
        <form className={styles.filterForm} onSubmit={handleFilterSubmit} noValidate>
          <div className={styles.filterRow}>
            <Input
              id="filter-actorId"
              label="Actor ID"
              value={actorIdInput}
              onChange={(event) => setActorIdInput(event.target.value)}
            />
            <Input
              id="filter-entityType"
              label="Entity Type"
              value={entityTypeInput}
              onChange={(event) => setEntityTypeInput(event.target.value)}
            />
            <Input
              id="filter-entityId"
              label="Entity ID"
              value={entityIdInput}
              onChange={(event) => setEntityIdInput(event.target.value)}
            />
          </div>
          <div className={styles.filterRow}>
            <Input id="filter-from" label="From" type="date" value={fromInput} onChange={(event) => setFromInput(event.target.value)} />
            <Input id="filter-to" label="To" type="date" value={toInput} onChange={(event) => setToInput(event.target.value)} />
            <label className={styles.sortLabel} htmlFor="filter-sort">
              <span className={styles.sortLabelText}>Sort by created date</span>
              <select
                id="filter-sort"
                className={styles.sortSelect}
                value={sort}
                onChange={(event) => handleSortChange(event.target.value as SortOrder)}
              >
                <option value="createdAt,desc">Newest first</option>
                <option value="createdAt,asc">Oldest first</option>
              </select>
            </label>
          </div>

          {dateRangeError ? (
            <p className={styles.filterError} role="alert">
              {dateRangeError}
            </p>
          ) : null}

          <div className={styles.filterActions}>
            <Button type="submit" label="Apply Filters" variant="outline" className={styles.filterButton} />
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

      {auditLogQuery.isLoading ? <LoadingState label="Loading audit log…" /> : null}

      {auditLogQuery.isError ? (
        <ErrorState
          message={auditLogErrorMessage(toApiError(auditLogQuery.error).code)}
          onRetry={() => auditLogQuery.refetch()}
        />
      ) : null}

      {auditLogQuery.isSuccess && auditLogQuery.data.content.length === 0 ? (
        <p className={styles.emptyMessage}>No audit log entries found.</p>
      ) : null}

      {auditLogQuery.isSuccess && auditLogQuery.data.content.length > 0 ? (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>Old Values</th>
                  <th>New Values</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {auditLogQuery.data.content.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.id}</td>
                    <td>
                      {entry.actorId ? (
                        <Link to={`/members/${entry.actorId}`}>{entry.actorEmail ?? entry.actorId}</Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{entry.action}</td>
                    <td>{entry.entityType ?? '—'}</td>
                    <td>{entry.entityId ?? '—'}</td>
                    <td className={styles.jsonValue}>{entry.oldValues ?? '—'}</td>
                    <td className={styles.jsonValue}>{entry.newValues ?? '—'}</td>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={auditLogQuery.data.page}
            totalPages={auditLogQuery.data.totalPages}
            first={auditLogQuery.data.first}
            last={auditLogQuery.data.last}
            onPageChange={setPage}
            disabled={auditLogQuery.isFetching}
          />
        </>
      ) : null}
    </div>
  );
}
