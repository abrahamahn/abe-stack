import { type ReactElement } from 'react';
import './primitives.css';

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onChange }: PaginationProps): ReactElement {
  const prev = (): void => {
    onChange(Math.max(1, page - 1));
  };
  const next = (): void => {
    onChange(Math.min(totalPages, page + 1));
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
            onChange(p);
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
