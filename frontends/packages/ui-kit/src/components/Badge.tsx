import React from 'react';
import { cn } from '../lib/utils';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'emerald';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const badgeVariants: Record<BadgeVariant, { bg: string; text: string; border: string; dot: string }> = {
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  neutral: {
    bg: 'bg-zinc-100',
    text: 'text-zinc-700',
    border: 'border-zinc-200',
    dot: 'bg-zinc-400',
  },
  outline: {
    bg: 'bg-white',
    text: 'text-zinc-700',
    border: 'border-zinc-200',
    dot: 'bg-zinc-400',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  danger: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  info: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500',
  },
};

/**
 * Supabase-style pill-shaped status badge with optical contrast,
 * subtle hairline border, and optional steady status dot.
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
  ...props
}) => {
  const styles = badgeVariants[variant] || badgeVariants.neutral;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-sans border select-none',
        styles.bg,
        styles.text,
        styles.border,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', styles.dot)} aria-hidden="true" />}
      {children}
    </span>
  );
};
