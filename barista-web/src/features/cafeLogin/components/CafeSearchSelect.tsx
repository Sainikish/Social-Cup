import { useState } from 'react';

import { Button, TextField } from '../../../components';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useCafeSearchQuery } from '../hooks';
import type { CafeSummaryResponse } from '../types';
import styles from './CafeSearchSelect.module.css';

export interface CafeSearchSelectProps {
  value: CafeSummaryResponse | null;
  onSelect: (cafe: CafeSummaryResponse) => void;
  onClear: () => void;
}

// A name-based cafe picker rather than a raw id field - the barista never
// types or sees a cafe UUID (see cafeLogin/api.ts: GET /cafes/search is the
// same public endpoint the member app's own cafe search already uses).
export function CafeSearchSelect({ value, onSelect, onClear }: CafeSearchSelectProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const searchQuery = useCafeSearchQuery(debouncedQuery);

  if (value) {
    return (
      <div className={styles.selected}>
        <div>
          <span className={styles.selectedLabel}>Cafe</span>
          <p className={styles.selectedName}>{value.name}</p>
        </div>
        <Button label="Change" variant="outline" onClick={onClear} />
      </div>
    );
  }

  const results = searchQuery.data?.content ?? [];

  return (
    <div className={styles.wrapper}>
      <TextField
        id="cafe-search"
        label="Cafe"
        placeholder="Search for your cafe by name"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
      />

      {searchQuery.isFetching ? <p className={styles.hint}>Searching…</p> : null}
      {searchQuery.isError ? (
        <p className={styles.hint}>Could not search cafes. Check your connection.</p>
      ) : null}
      {!searchQuery.isFetching && searchQuery.isSuccess && results.length === 0 ? (
        <p className={styles.hint}>No cafes matched &quot;{debouncedQuery}&quot;.</p>
      ) : null}

      {results.length > 0 ? (
        <ul className={styles.list}>
          {results.map((cafe) => (
            <li key={cafe.id}>
              <button type="button" className={styles.option} onClick={() => onSelect(cafe)}>
                <span className={styles.optionName}>{cafe.name}</span>
                {cafe.neighbourhood ? <span className={styles.optionMeta}>{cafe.neighbourhood}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
