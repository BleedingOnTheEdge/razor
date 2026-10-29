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
    <div className="border border-[#262626] bg-[#171717] rounded-xl p-4 font-mono space-y-3">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#262626]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-zinc-100 uppercase tracking-wider">{title}</span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-[#262626] bg-[#141414] font-bold text-zinc-300">
            {selectedIds.length} SELECTED
          </span>
          {isMultiSelect && <span className="text-[10px] text-zinc-500 font-sans">(Multi-Select)</span>}
        </div>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 border border-rose-800/40 px-2.5 py-0.5 rounded-full bg-rose-950/20 transition-colors self-start sm:self-auto"
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
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-[#262626] bg-[#141414] text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 focus:bg-[#171717]"
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
            className="px-2 py-1.5 rounded-md border border-[#262626] bg-[#171717] text-xs font-mono text-zinc-100 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30"
          >
            <option value="all">All Components</option>
            <option value="owned">Owned Only</option>
          </select>
        </div>
      </div>

      {/* Grid Display */}
      {paginatedItems.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-[#262626]">
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
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between select-none ${
                  isSelected
                    ? 'border-[#3ECF8E] bg-[#3ECF8E]/10 text-zinc-100 shadow-sm'
                    : 'border-[#262626] bg-[#141414] hover:border-[#333333] hover:bg-[#171717] text-zinc-100'
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
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#3ECF8E] shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      )}
                    </div>
                  </div>
                  <p
                    className={`text-[11px] line-clamp-2 font-sans ${
                      isSelected ? 'text-zinc-200' : 'text-zinc-400'
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
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                      item.isOwned
                        ? isSelected
                          ? 'border-[#3ECF8E]/50 bg-[#3ECF8E]/20 text-[#3ECF8E]'
                          : 'border-[#3ECF8E]/30 bg-emerald-950/20 text-[#3ECF8E]'
                        : 'border-[#262626] bg-[#171717] text-zinc-400'
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
        <div className="flex items-center justify-between pt-2 border-t border-[#262626] text-xs">
          <span className="text-[11px] text-zinc-400">
            Page {currentPage} of {totalPages} ({filteredItems.length} items)
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-md border border-[#262626] bg-[#171717] hover:bg-[#1f1f1f] disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-md border border-[#262626] bg-[#171717] hover:bg-[#1f1f1f] disabled:opacity-40"
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
