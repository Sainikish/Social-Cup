import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { Button, Card, ErrorState, Input, LoadingState, Pagination } from '../../components';
import {
  cafeErrorMessage,
  useAdminCafeSearchQuery,
  type CafeAdminSearchParams,
  type CafeStatus,
} from '../../features/cafes';
import styles from './CafeList.module.css';

const PAGE_SIZE = 20;
const ALL_STATUSES: CafeStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

// Backed by GET /admin/cafes (search+paginate, any status including
// archived) and GET /admin/cafes/{id} (row click) - both added alongside
// this screen, replacing the old public-search-only fallback that could
// never show an inactive/archived cafe.
export function CafeList() {
  const [queryInput, setQueryInput] = useState('');
  const [statusInput, setStatusInput] = useState<CafeStatus | ''>('');
  const [filters, setFilters] = useState<CafeAdminSearchParams>({});
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const searchQuery = useAdminCafeSearchQuery({ ...filters, page, size: PAGE_SIZE });

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
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Cafes</h1>
          <p className={styles.subtitle}>Search cafes of any status, or create a new one.</p>
        </div>
        <Button label="Create Cafe" onClick={() => navigate('/cafes/new')} className={styles.createButton} />
      </header>

      <Card className={styles.filterCard}>
        <h2 className={styles.sectionTitle}>Filters</h2>
        <form className={styles.filterForm} onSubmit={handleFilterSubmit} noValidate>
          <div className={styles.filterRow}>
            <Input
              id="cafe-search-query"
              label="Search by name or address"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
            />
            <label className={styles.statusLabel} htmlFor="cafe-search-status">
              <span className={styles.statusLabelText}>Status</span>
              <select
                id="cafe-search-status"
                className={styles.statusSelect}
                value={statusInput}
                onChange={(event) => setStatusInput(event.target.value as CafeStatus | '')}
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

      {searchQuery.isLoading ? <LoadingState label="Loading cafes…" /> : null}

      {searchQuery.isError ? (
        <ErrorState
          message={cafeErrorMessage(toApiError(searchQuery.error).code)}
          onRetry={() => searchQuery.refetch()}
        />
      ) : null}

      {searchQuery.isSuccess && searchQuery.data.content.length === 0 ? (
        <p className={styles.emptyMessage}>No cafes matched these filters.</p>
      ) : null}

      {searchQuery.isSuccess && searchQuery.data.content.length > 0 ? (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Neighbourhood</th>
                  <th>Status</th>
                  <th>Featured</th>
                </tr>
              </thead>
              <tbody>
                {searchQuery.data.content.map((cafe) => (
                  <tr key={cafe.id}>
                    <td>
                      <Link to={`/cafes/${cafe.id}`}>{cafe.name}</Link>
                    </td>
                    <td>{cafe.address}</td>
                    <td>{cafe.neighbourhood ?? '—'}</td>
                    <td>{cafe.status}</td>
                    <td>{cafe.featured ? 'Yes' : 'No'}</td>
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
