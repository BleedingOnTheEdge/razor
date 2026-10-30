import React from 'react';
import { cn } from '../lib/utils';

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
 * Supabase-style dense financial and telemetry metric card with tabular numeral alignment,
 * near-black surface (#171717), hairline border (#262626), and emerald #3ECF8E accents.
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
      className={cn(
        'rounded-xl bg-white border border-zinc-200 p-4 shadow-sm shadow-slate-100 flex flex-col justify-between transition-colors hover:border-zinc-300',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-zinc-500 font-sans tracking-normal">{label}</span>
        {icon && <div className="text-zinc-500">{icon}</div>}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <div className="text-2xl font-semibold tracking-tight text-zinc-900 font-sans tabular-nums">
          {value}
        </div>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full font-sans tabular-nums border',
              trend.neutral
                ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                : trend.positive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-2 text-xs text-zinc-500 font-sans leading-relaxed">{subtitle}</p>}
    </div>
  );
};
