import React from 'react';
import { cn } from '../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Supabase-style dark-mode-native Input.
 * Features #171717 surface, #262626 hairline border, emerald #3ECF8E focus ring.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg border border-[#262626] bg-[#171717] px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 font-sans shadow-sm shadow-black/20 transition-colors',
          'file:border-0 file:bg-transparent file:text-xs file:font-medium',
          'focus-visible:outline-none focus-visible:border-[#3ECF8E] focus-visible:ring-1 focus-visible:ring-[#3ECF8E]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
