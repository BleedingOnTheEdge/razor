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
        'rounded-xl bg-[#171717] border border-[#262626] p-4 shadow-sm shadow-black/40 flex flex-col justify-between transition-colors hover:border-[#333333]',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-zinc-400 font-sans tracking-normal">{label}</span>
        {icon && <div className="text-zinc-400">{icon}</div>}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <div className="text-2xl font-semibold tracking-tight text-zinc-100 font-mono tabular-nums">
          {value}
        </div>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full font-mono tabular-nums border',
              trend.neutral
                ? 'bg-[#222222] text-zinc-400 border-[#2e2e2e]'
                : trend.positive
                ? 'bg-[#3ECF8E]/10 text-[#3ECF8E] border-[#3ECF8E]/25'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
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
