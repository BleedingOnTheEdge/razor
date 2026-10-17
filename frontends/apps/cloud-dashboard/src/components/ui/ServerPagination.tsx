'use client';

import React from 'react';

export interface ServerPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function ServerPagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
}: ServerPaginationProps) {
  if (totalCount <= 0 && totalPages <= 1) {
    return null;
  }

  const safeTotalPages = Math.max(1, totalPages);
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(totalCount, page * pageSize);

  // Generate numbered pages with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) {
        pages.push('...');
      }
      const start = Math.max(2, page - 1);
      const end = Math.min(safeTotalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (page < safeTotalPages - 2) {
        pages.push('...');
      }
      pages.push(safeTotalPages);
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 py-3 px-4 bg-white border border-black font-mono text-xs ${className}`}
    >
      <div className="flex items-center gap-4">
        <span>
          Showing <strong className="font-bold text-black">{startItem}</strong> -{' '}
          <strong className="font-bold text-black">{endItem}</strong> of{' '}
          <strong className="font-bold text-black">{totalCount}</strong> items
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Select items per page"
              className="bg-white text-black border border-black px-2 py-1 font-mono font-bold focus:outline-none"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 bg-white text-black border border-black font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors"
        >
          PREV
        </button>

        {getPageNumbers().map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={idx}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1 border font-bold transition-colors ${
                p === page
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black hover:bg-zinc-200'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="px-2 py-1 text-black font-bold select-none">
              ...
            </span>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotalPages}
          className="px-3 py-1 bg-white text-black border border-black font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors"
        >
          NEXT
        </button>
      </div>
    </div>
  );
}
