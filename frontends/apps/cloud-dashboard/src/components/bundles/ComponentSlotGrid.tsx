'use client';

import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, Circle, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import type { AvailableComponent } from '@/types/bundle';

export interface ComponentSlotGridProps {
  title: string;
  kind: 'Strategy' | 'Adapter' | 'Hook';
  availableItems: AvailableComponent[];
  selectedIds: string[];
  isMultiSelect?: boolean;
  onSelect: (id: string) => void;
  onDeselect: (id: string) => void;
  onClear: () => void;
}

export function ComponentSlotGrid({
  title,
  kind,
  availableItems,
  selectedIds,
  isMultiSelect = false,
  onSelect,
  onDeselect,
  onClear,
}: ComponentSlotGridProps) {
  const [search, setSearch] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'owned'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // Filter items for this slot kind
  const filteredItems = useMemo(() => {
    return availableItems.filter((item) => {
      if (item.kind !== kind) return false;
      if (ownershipFilter === 'owned' && !item.isOwned) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchCat = item.category?.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [availableItems, kind, ownershipFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onDeselect(id);
    } else {
      onSelect(id);
    }
  };

  return (
    <div className="border border-black bg-white p-4 font-mono space-y-3">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-black uppercase tracking-wider">{title}</span>
          <span className="text-[10px] px-1.5 py-0.5 border border-black bg-zinc-100 font-bold">
            {selectedIds.length} SELECTED
          </span>
          {isMultiSelect && <span className="text-[10px] text-zinc-500 font-sans">(Multi-Select)</span>}
        </div>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 border border-red-300 hover:border-red-600 px-2 py-0.5 bg-red-50 transition-colors self-start sm:self-auto"
            title="Remove selection and clear slot"
          >
            <X className="w-3 h-3" />
            <span>Clear Selection</span>
          </button>
        )}
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={`Search ${kind.toLowerCase()}s...`}
            className="w-full pl-8 pr-3 py-1.5 border border-black bg-zinc-50 text-xs text-black placeholder-zinc-400 focus:outline-none focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-zinc-500 ml-1" />
          <select
            value={ownershipFilter}
            onChange={(e) => {
              setOwnershipFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-2 py-1.5 border border-black bg-white text-xs font-mono text-black focus:outline-none"
          >
            <option value="all">All Components</option>
            <option value="owned">Owned Only</option>
          </select>
        </div>
      </div>

      {/* Grid Display */}
      {paginatedItems.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-300">
          No {kind.toLowerCase()} components match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {paginatedItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => handleToggle(item.id)}
                className={`p-3 border text-left cursor-pointer transition-all flex flex-col justify-between select-none ${
                  isSelected
                    ? 'border-black bg-black text-white shadow-sm'
                    : 'border-zinc-300 bg-white hover:border-black text-black'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle(item.id);
                  }
                }}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate max-w-[160px]">{item.name}</span>
                    <div className="flex items-center gap-1">
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      )}
                    </div>
                  </div>
                  <p
                    className={`text-[11px] line-clamp-2 font-sans ${
                      isSelected ? 'text-zinc-200' : 'text-zinc-600'
                    }`}
                  >
                    {item.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 mt-2 border-t border-current/20 text-[10px]">
                  <span className={isSelected ? 'text-zinc-300' : 'text-zinc-500'}>
                    v{item.version} • {item.author}
                  </span>
                  <span
                    className={`px-1 py-0.2 border ${
                      item.isOwned
                        ? isSelected
                          ? 'border-white text-white'
                          : 'border-green-600 text-green-700 bg-green-50'
                        : isSelected
                        ? 'border-zinc-400 text-zinc-300'
                        : 'border-zinc-300 text-zinc-500'
                    }`}
                  >
                    {item.isOwned ? 'OWNED' : 'MARKET'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 text-xs">
          <span className="text-[11px] text-zinc-600">
            Page {currentPage} of {totalPages} ({filteredItems.length} items)
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 border border-black bg-white hover:bg-zinc-100 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 border border-black bg-white hover:bg-zinc-100 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
