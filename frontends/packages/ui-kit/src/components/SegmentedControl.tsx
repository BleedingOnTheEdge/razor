import React from 'react';

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
 * Apple-style segmented control switcher for high-efficiency tab and filter pivoting.
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
      className={`inline-flex items-center rounded-xl bg-zinc-900/90 border border-zinc-800/80 p-1 select-none ${className}`}
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
            className={`relative flex items-center justify-center font-medium transition-all duration-150 rounded-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
              isSm ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
            } ${
              isSelected
                ? 'bg-zinc-800 text-zinc-100 shadow-sm shadow-black/40 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                  isSelected ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-zinc-500'
                }`}
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
