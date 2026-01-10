import { type ReactElement } from 'react';

import { useControllableState } from '../hooks/useControllableState';
import '../styles/elements.css';

type PaginationProps = {
  value?: number;
  defaultValue?: number;
  totalPages: number;
  onChange?: (value: number) => void;
};

export function Pagination({
  value,
  defaultValue,
  totalPages,
  onChange,
}: PaginationProps): ReactElement {
  const [currentPage, setPage] = useControllableState<number>({
    value,
    defaultValue: defaultValue ?? 1,
    onChange,
  });

  const page = currentPage ?? 1;

  const prev = (): void => {
    setPage(Math.max(1, page - 1));
  };
  const next = (): void => {
    setPage(Math.min(totalPages, page + 1));
  };

  return (
    <div className="ui-pagination">
      <button className="ui-pagination-button" onClick={prev} disabled={page <= 1}>
        ‹
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          className="ui-pagination-button"
          data-active={p === page}
          onClick={() => {
            setPage(p);
          }}
        >
          {p}
        </button>
      ))}
      <button className="ui-pagination-button" onClick={next} disabled={page >= totalPages}>
        ›
      </button>
    </div>
  );
}
