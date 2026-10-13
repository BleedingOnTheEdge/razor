import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-cyan-500 text-zinc-950 hover:bg-cyan-400 font-semibold shadow-sm shadow-cyan-500/20 active:bg-cyan-500',
  secondary:
    'bg-zinc-800/80 text-zinc-100 hover:bg-zinc-750 border border-zinc-700/60 active:bg-zinc-800',
  destructive:
    'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 active:bg-rose-500/20',
  ghost:
    'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 active:bg-zinc-800/70',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-3.5 py-2 text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
};

/**
 * Apple-style tactile button featuring physical press feedback (scale 0.98),
 * optical typography, accessible focus states, and spring-settle transitions.
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      aria-busy={isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-100 select-none
        active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
        disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
