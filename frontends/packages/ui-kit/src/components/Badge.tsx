import React from 'react';
import { cn } from '../lib/utils';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'emerald';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const badgeVariants: Record<BadgeVariant, { bg: string; text: string; border: string; dot: string }> = {
  emerald: {
    bg: 'bg-[#3ECF8E]/10',
    text: 'text-[#3ECF8E]',
    border: 'border-[#3ECF8E]/25',
    dot: 'bg-[#3ECF8E]',
  },
  success: {
    bg: 'bg-[#3ECF8E]/10',
    text: 'text-[#3ECF8E]',
    border: 'border-[#3ECF8E]/25',
    dot: 'bg-[#3ECF8E]',
  },
  neutral: {
    bg: 'bg-[#1f1f1f]',
    text: 'text-zinc-300',
    border: 'border-[#2e2e2e]',
    dot: 'bg-zinc-400',
  },
  outline: {
    bg: 'bg-transparent',
    text: 'text-zinc-300',
    border: 'border-[#2e2e2e]',
    dot: 'bg-zinc-400',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/25',
    dot: 'bg-amber-400',
  },
  danger: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/25',
    dot: 'bg-rose-400',
  },
  info: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/25',
    dot: 'bg-cyan-400',
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
