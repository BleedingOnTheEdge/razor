import React from 'react';
import { cn } from '../lib/utils';

export interface SegmentedControlOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  selectedId: T;
  onChange: (id: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Supabase-style segmented control switcher for high-efficiency tab and filter pivoting.
 * Features dark-mode-native near-black surfaces (#171717 / #222222), subtle borders,
 * and Source Code Pro tabular numeral badges.
 */
export function SegmentedControl<T extends string = string>({
  options,
  selectedId,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const isSm = size === 'sm';

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center rounded-lg bg-white border border-zinc-200 p-1 select-none',
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = opt.id === selectedId;

        return (
          <button
            key={opt.id}
            role="tab"
            type="button"
            aria-selected={isSelected}
            onClick={() => onChange(opt.id)}
            className={cn(
              'relative flex items-center justify-center font-medium font-sans transition-all duration-150 rounded-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ECF8E]/50',
              isSm ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              isSelected
                ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent'
            )}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  'ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-sans tabular-nums',
                  isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
