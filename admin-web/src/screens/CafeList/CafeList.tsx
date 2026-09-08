import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { Button, Card, ErrorState, Input, LoadingState } from '../../components';
import { cafeErrorMessage, useCafeSearchQuery } from '../../features/cafes';
import styles from './CafeList.module.css';

// There is no admin cafe listing endpoint on the backend, so this screen is
// NOT "All Cafes" - it is a search over the same public, ACTIVE-cafe-only
// endpoint mobile/barista-web use (GET /cafes/search). Inactive/archived
// cafes will never appear here; that limitation is stated explicitly below
// rather than left implicit.
export function CafeList() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [jumpToId, setJumpToId] = useState('');
  const navigate = useNavigate();

  const searchQuery = useCafeSearchQuery(submittedQuery);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query);
  }

  function handleJumpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = jumpToId.trim();
    if (trimmed) {
      navigate(`/cafes/${trimmed}`);
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Cafes</h1>
          <p className={styles.subtitle}>Search active cafes, or create a new one.</p>
        </div>
        <Button label="Create Cafe" onClick={() => navigate('/cafes/new')} className={styles.createButton} />
      </header>

      <Card className={styles.notice}>
        <p className={styles.noticeText}>
          There is no admin cafe listing endpoint yet. This searches the same public,{' '}
          <strong>active-cafes-only</strong> search the mobile app uses (<code>GET /cafes/search</code>) - inactive
          and archived cafes will not appear here. If you know a cafe&apos;s ID, open it directly below.
        </p>
      </Card>

      <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
        <Input
          id="cafe-search-query"
          label="Search active cafes by name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" label="Search" variant="outline" className={styles.searchButton} />
      </form>

      {searchQuery.isFetching ? <LoadingState label="Searching…" /> : null}
      {searchQuery.isError ? (
        <ErrorState
          message={cafeErrorMessage(toApiError(searchQuery.error).code)}
          onRetry={() => searchQuery.refetch()}
        />
      ) : null}
      {searchQuery.isSuccess && searchQuery.data.content.length === 0 ? (
        <p className={styles.emptyMessage}>No active cafes matched &quot;{submittedQuery}&quot;.</p>
      ) : null}

      {searchQuery.isSuccess && searchQuery.data.content.length > 0 ? (
        <ul className={styles.resultList}>
          {searchQuery.data.content.map((cafe) => (
            <li key={cafe.id}>
              <Link to={`/cafes/${cafe.id}`} className={styles.resultLink}>
                <span className={styles.resultName}>{cafe.name}</span>
                <span className={styles.resultMeta}>
                  {cafe.address}
                  {cafe.neighbourhood ? ` · ${cafe.neighbourhood}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <Card className={styles.jumpCard}>
        <h2 className={styles.jumpTitle}>Open a cafe by ID</h2>
        <p className={styles.noticeText}>
          Inactive or archived cafes cannot be found by search - open them here if you already know their ID.
        </p>
        <form className={styles.jumpForm} onSubmit={handleJumpSubmit}>
          <Input
            id="cafe-jump-id"
            label="Cafe ID"
            value={jumpToId}
            onChange={(event) => setJumpToId(event.target.value)}
          />
          <Button type="submit" label="Open" variant="outline" className={styles.searchButton} />
        </form>
      </Card>
    </div>
  );
}
