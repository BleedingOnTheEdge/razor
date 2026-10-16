import React from 'react';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const badgeVariants: Record<BadgeVariant, { bg: string; text: string; border: string; dot: string }> = {
  neutral: {
    bg: 'bg-zinc-100 dark:bg-zinc-800/80',
    text: 'text-zinc-700 dark:text-zinc-300',
    border: 'border-zinc-300 dark:border-zinc-700/60',
    dot: 'bg-zinc-500 dark:bg-zinc-400',
  },
  outline: {
    bg: 'bg-transparent',
    text: 'text-zinc-700 dark:text-zinc-300',
    border: 'border-zinc-300 dark:border-zinc-700/60',
    dot: 'bg-zinc-400',
  },
  success: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  danger: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-500/20',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  info: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-700 dark:text-cyan-400',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-500 dark:bg-cyan-400',
  },
};

/**
 * Pill-shaped status badge with optical contrast, subtle border,
 * and optional pulsating or steady status dot.
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
  ...props
}) => {
  const styles = badgeVariants[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none
        ${styles.bg} ${styles.text} ${styles.border} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
      {children}
    </span>
  );
};
