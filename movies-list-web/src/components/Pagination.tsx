import { Pagination as PaginationState } from "contracts/api";

interface Props {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ pagination, onPageChange }: Props): JSX.Element | null => {
  if (pagination.totalPages <= 1) {
    return null;
  }

  const buttonClass =
    "rounded-lg border border-white/30 px-4 py-2 text-sm text-white transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-4">
      <button
        type="button"
        className={buttonClass}
        disabled={pagination.page <= 1}
        onClick={() => onPageChange(pagination.page - 1)}
      >
        Previous
      </button>
      <span className="text-sm text-white/70">
        Page {pagination.page} of {pagination.totalPages} · {pagination.total} movies
      </span>
      <button
        type="button"
        className={buttonClass}
        disabled={!pagination.hasMore}
        onClick={() => onPageChange(pagination.page + 1)}
      >
        Next
      </button>
    </nav>
  );
};
