import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  asChild?: boolean;
  pill?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] active:bg-[#2ea36f] font-semibold shadow-sm shadow-[#3ECF8E]/20 border border-transparent focus-visible:ring-[#3ECF8E]',
  secondary:
    'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 active:bg-zinc-200 shadow-sm focus-visible:ring-zinc-400',
  destructive:
    'bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border border-rose-200 active:bg-rose-200 focus-visible:ring-rose-500',
  ghost:
    'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent focus-visible:ring-zinc-400',
  outline:
    'bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 active:bg-zinc-100 focus-visible:ring-zinc-400',
  link:
    'text-[#059669] hover:text-[#047857] underline-offset-4 hover:underline border-transparent focus-visible:ring-[#10b981] p-0 h-auto',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2.5',
  icon: 'h-9 w-9 p-0 justify-center',
};

/**
 * Supabase-style custom Button component built on Radix UI Slot.
 * Features pill-shaped primary CTAs with emerald #3ECF8E accents,
 * tactile spring feedback, accessible focus rings, and Lucide spinner.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      asChild = false,
      pill,
      className = '',
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || isLoading;

    // Primary variant is pill-shaped by default unless explicitly overridden,
    // or if pill prop is true for other variants.
    const isPill = pill !== undefined ? pill : variant === 'primary';
    const radiusClass = isPill ? 'rounded-full' : 'rounded-lg';

    return (
      <Comp
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        className={cn(
          'inline-flex items-center justify-center font-sans whitespace-nowrap select-none transition-all duration-150',
          'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f]',
          'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
          radiusClass,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-current -ml-1 mr-2" aria-hidden="true" />
            <span>Loading…</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';
