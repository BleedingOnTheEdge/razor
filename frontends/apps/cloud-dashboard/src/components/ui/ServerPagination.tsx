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
      className={`flex flex-wrap items-center justify-between gap-4 py-3 px-4 bg-[#171717] border border-[#262626] rounded-xl font-sans text-xs text-zinc-400 ${className}`}
    >
      <div className="flex items-center gap-4">
        <span>
          Showing <strong className="font-medium text-zinc-100 font-mono">{startItem}</strong> –{' '}
          <strong className="font-medium text-zinc-100 font-mono">{endItem}</strong> of{' '}
          <strong className="font-medium text-zinc-100 font-mono">{totalCount}</strong> items
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Select items per page"
              className="bg-[#222222] text-zinc-200 border border-[#2e2e2e] rounded-md px-2 py-1 font-mono text-xs focus:outline-none focus:border-[#3ECF8E]"
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
          className="px-2.5 py-1 bg-[#222222] text-zinc-300 border border-[#2e2e2e] rounded-md font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#2a2a2a] hover:text-white transition-colors"
        >
          Prev
        </button>

        {getPageNumbers().map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={idx}
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 flex items-center justify-center rounded-md font-mono text-xs transition-colors ${
                p === page
                  ? 'bg-[#3ECF8E] text-[#0f0f0f] font-semibold'
                  : 'bg-[#222222] text-zinc-300 border border-[#2e2e2e] hover:bg-[#2a2a2a] hover:text-white'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="px-1 text-zinc-500 font-mono">
              {p}
            </span>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotalPages}
          className="px-2.5 py-1 bg-[#222222] text-zinc-300 border border-[#2e2e2e] rounded-md font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#2a2a2a] hover:text-white transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
