import React from 'react';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
    neutral?: boolean;
  };
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * High-density financial metric display card with tabular numeral alignment,
 * optical hierarchy, and clean typography.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  trend,
  subtitle,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl bg-zinc-900/70 backdrop-blur-md border border-zinc-800/80 p-5 shadow-lg shadow-black/10 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400 tracking-normal">{label}</span>
        {icon && <div className="text-zinc-500">{icon}</div>}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <div className="text-2xl font-semibold tracking-tight text-zinc-100 font-mono tabular-nums">
          {value}
        </div>
        {trend && (
          <span
            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full font-mono tabular-nums ${
              trend.neutral
                ? 'bg-zinc-800 text-zinc-400'
                : trend.positive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-2 text-xs text-zinc-500">{subtitle}</p>}
    </div>
  );
};
