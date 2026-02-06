// client/ui/src/components/Pagination.tsx
import { useControllableState } from '@hooks/useControllableState';

import type { ReactElement } from 'react';

import '../styles/components.css';

type PaginationProps = {
  /** Controlled current page */
  value?: number;
  /** Initially selected page for uncontrolled usage */
  defaultValue?: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onChange?: (value: number) => void;
  /** Accessible label for the pagination navigation */
  ariaLabel?: string;
};

/**
 * Accessible pagination navigation component.
 *
 * @example
 * ```tsx
 * <Pagination value={page} totalPages={10} onChange={setPage} />
 * ```
 */
export const Pagination = ({
  value,
  defaultValue,
  totalPages,
  onChange,
  ariaLabel = 'Pagination',
}: PaginationProps): ReactElement => {
  const [currentPage, setPage] = useControllableState<number>({
    ...(value !== undefined && { value }),
    defaultValue: defaultValue ?? 1,
    ...(onChange !== undefined && { onChange }),
  });

  const page = currentPage ?? 1;

  const prev = (): void => {
    setPage(Math.max(1, page - 1));
  };
  const next = (): void => {
    setPage(Math.min(totalPages, page + 1));
  };

  return (
    <nav className="pagination" role="navigation" aria-label={ariaLabel}>
      <button
        className="pagination-button"
        onClick={prev}
        disabled={page <= 1}
        aria-label="Go to previous page"
      >
        ‹
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          className="pagination-button"
          data-active={p === page}
          aria-current={p === page ? 'page' : undefined}
          aria-label={`Go to page ${String(p)}`}
          onClick={() => {
            setPage(p);
          }}
        >
          {p}
        </button>
      ))}
      <button
        className="pagination-button"
        onClick={next}
        disabled={page >= totalPages}
        aria-label="Go to next page"
      >
        ›
      </button>
    </nav>
  );
};
