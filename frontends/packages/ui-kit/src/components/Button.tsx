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
    'bg-[#3ECF8E] text-[#0f0f0f] hover:bg-[#34b27b] active:bg-[#2ea36f] font-medium shadow-sm shadow-[#3ECF8E]/10 border border-transparent focus-visible:ring-[#3ECF8E]',
  secondary:
    'bg-[#171717] text-zinc-100 hover:bg-[#222222] hover:text-white border border-[#262626] hover:border-[#383838] active:bg-[#1f1f1f] shadow-sm shadow-black/20 focus-visible:ring-zinc-400',
  destructive:
    'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/30 active:bg-rose-500/15 focus-visible:ring-rose-500',
  ghost:
    'text-zinc-400 hover:text-zinc-100 hover:bg-[#171717] active:bg-[#1f1f1f] border border-transparent focus-visible:ring-zinc-400',
  outline:
    'bg-transparent text-zinc-200 hover:bg-[#171717] hover:text-zinc-100 border border-[#262626] hover:border-[#383838] active:bg-[#171717] focus-visible:ring-zinc-400',
  link:
    'text-[#3ECF8E] hover:text-[#34b27b] underline-offset-4 hover:underline border-transparent focus-visible:ring-[#3ECF8E] p-0 h-auto',
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
