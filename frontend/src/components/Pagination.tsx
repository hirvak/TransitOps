import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Pagination as PaginationType } from "../types";

interface PaginationProps {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange }) => {
  const { current_page, total_pages } = pagination;

  if (total_pages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-muted-foreground text-sm">
        Page <b>{current_page}</b> of <b>{total_pages}</b>
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(current_page - 1)}
          disabled={current_page <= 1}
          className="p-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(current_page + 1)}
          disabled={current_page >= total_pages}
          className="p-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
