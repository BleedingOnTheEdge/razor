import React from 'react';
import { cn } from '../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Supabase-style dark-mode-native Textarea.
 * Features #171717 surface, #262626 hairline border, emerald #3ECF8E focus ring.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-[#262626] bg-[#171717] px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 font-sans shadow-sm shadow-slate-100 transition-colors',
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
Textarea.displayName = 'Textarea';
