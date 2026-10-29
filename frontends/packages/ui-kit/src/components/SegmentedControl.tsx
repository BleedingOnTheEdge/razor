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
        'inline-flex items-center rounded-lg bg-[#171717] border border-[#262626] p-1 select-none',
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
                ? 'bg-[#222222] text-[#3ECF8E] font-semibold border border-[#333333] shadow-sm shadow-black/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1c1c] border border-transparent'
            )}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  'ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums',
                  isSelected ? 'bg-[#3ECF8E]/15 text-[#3ECF8E]' : 'bg-[#262626] text-zinc-400'
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
