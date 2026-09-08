import { Button } from '../Button';
import styles from './Pagination.module.css';

export interface PaginationProps {
  page: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

// A reusable prev/next pager for any PageResponse<T> - RedemptionList is its
// first consumer, but nothing here is feature-specific. Renders nothing for
// a single-page (or empty) result rather than a pager with both buttons
// permanently disabled. first/last/totalPages are read directly off the
// backend's own PageResponse rather than recomputed here.
export function Pagination({ page, totalPages, first, last, onPageChange, disabled = false }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className={styles.container} aria-label="Pagination">
      <Button
        label="Previous"
        variant="outline"
        className={styles.pageButton}
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || first}
      />
      <span className={styles.pageStatus}>
        Page {page + 1} of {totalPages}
      </span>
      <Button
        label="Next"
        variant="outline"
        className={styles.pageButton}
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || last}
      />
    </nav>
  );
}
