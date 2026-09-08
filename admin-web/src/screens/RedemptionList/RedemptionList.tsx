import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { Button, Card, ErrorState, Input, LoadingState, Pagination } from '../../components';
import { redemptionErrorMessage, useRedemptionsQuery, type RedemptionFilters } from '../../features/redemptions';
import styles from './RedemptionList.module.css';

const PAGE_SIZE = 20;
type SortOrder = 'createdAt,desc' | 'createdAt,asc';

// Cross-cafe, read-only redemption history, backed by GET /admin/redemptions.
// Every value shown - credits deducted, payout rate, created date - is
// exactly what the backend returns; there is no client-side financial
// calculation, and no edit/delete/refund/mutation action exists here or
// anywhere else for a Redemption. Member/cafe/drink cells link to their own
// existing detail screens rather than duplicating data this screen isn't
// given (e.g. no member name - only memberEmail is returned).
export function RedemptionList() {
  const [cafeIdInput, setCafeIdInput] = useState('');
  const [memberIdInput, setMemberIdInput] = useState('');
  const [drinkIdInput, setDrinkIdInput] = useState('');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [sort, setSort] = useState<SortOrder>('createdAt,desc');
  const [dateRangeError, setDateRangeError] = useState<string | undefined>();

  const [filters, setFilters] = useState<RedemptionFilters>({});
  const [page, setPage] = useState(0);

  const redemptionsQuery = useRedemptionsQuery({ ...filters, page, size: PAGE_SIZE, sort });

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDateRangeError(undefined);

    if (fromInput && toInput && toInput < fromInput) {
      setDateRangeError('"To" cannot be before "From".');
      return;
    }

    setFilters({
      cafeId: cafeIdInput.trim() || undefined,
      memberId: memberIdInput.trim() || undefined,
      drinkId: drinkIdInput.trim() || undefined,
      from: fromInput || undefined,
      to: toInput || undefined,
    });
    setPage(0);
  }

  function handleReset() {
    setCafeIdInput('');
    setMemberIdInput('');
    setDrinkIdInput('');
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
      <h1 className={styles.title}>Redemptions</h1>

      <Card className={styles.notice}>
        <p className={styles.noticeText}>
          Read-only historical redemption records from <code>GET /admin/redemptions</code>. Every value shown -
          credits deducted, payout rate, created date - is exactly what the backend returns; there is no edit,
          delete, refund, or other mutation action on this screen.
        </p>
      </Card>

      <Card className={styles.filterCard}>
        <h2 className={styles.sectionTitle}>Filters</h2>
        <form className={styles.filterForm} onSubmit={handleFilterSubmit} noValidate>
          <div className={styles.filterRow}>
            <Input
              id="filter-cafeId"
              label="Cafe ID"
              value={cafeIdInput}
              onChange={(event) => setCafeIdInput(event.target.value)}
            />
            <Input
              id="filter-memberId"
              label="Member ID"
              value={memberIdInput}
              onChange={(event) => setMemberIdInput(event.target.value)}
            />
            <Input
              id="filter-drinkId"
              label="Drink ID"
              value={drinkIdInput}
              onChange={(event) => setDrinkIdInput(event.target.value)}
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

      {redemptionsQuery.isLoading ? <LoadingState label="Loading redemptions…" /> : null}

      {redemptionsQuery.isError ? (
        <ErrorState
          message={redemptionErrorMessage(toApiError(redemptionsQuery.error).code)}
          onRetry={() => redemptionsQuery.refetch()}
        />
      ) : null}

      {redemptionsQuery.isSuccess && redemptionsQuery.data.content.length === 0 ? (
        <p className={styles.emptyMessage}>No redemptions found.</p>
      ) : null}

      {redemptionsQuery.isSuccess && redemptionsQuery.data.content.length > 0 ? (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Redemption ID</th>
                  <th>Member</th>
                  <th>Cafe</th>
                  <th>Drink</th>
                  <th>Credits Deducted</th>
                  <th>Payout Rate</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {redemptionsQuery.data.content.map((redemption) => (
                  <tr key={redemption.redemptionId}>
                    <td>{redemption.redemptionId}</td>
                    <td>
                      <Link to={`/members/${redemption.memberId}`}>{redemption.memberEmail}</Link>
                    </td>
                    <td>
                      <Link to={`/cafes/${redemption.cafeId}`}>{redemption.cafeName}</Link>
                    </td>
                    <td>
                      <Link to={`/drinks/${redemption.drinkId}`}>{redemption.drinkName}</Link>
                    </td>
                    <td>{redemption.creditsDeducted}</td>
                    <td>{redemption.payoutRate.toFixed(4)}</td>
                    <td>{new Date(redemption.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={redemptionsQuery.data.page}
            totalPages={redemptionsQuery.data.totalPages}
            first={redemptionsQuery.data.first}
            last={redemptionsQuery.data.last}
            onPageChange={setPage}
            disabled={redemptionsQuery.isFetching}
          />
        </>
      ) : null}
    </div>
  );
}
