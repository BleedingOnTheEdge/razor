import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ModalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const widthStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

/**
 * Supabase-style modal dialog sheet with blurred backdrop, interruptible escape handling,
 * near-black surface (#171717), hairline border (#262626), and accessible dialog semantics.
 */
export const ModalSheet: React.FC<ModalSheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-sheet-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Surface Dialog */}
      <div
        className={cn(
          'relative w-full rounded-2xl bg-white border border-zinc-200 shadow-2xl shadow-slate-200/50 p-6 z-10 animate-in zoom-in-95 duration-150',
          widthStyles[maxWidth]
        )}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 id="modal-sheet-title" className="text-lg font-semibold tracking-tight text-zinc-900 font-sans">
              {title}
            </h2>
            {description && <p className="text-sm text-zinc-500 mt-1 font-sans">{description}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ECF8E]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2 font-sans">{children}</div>
      </div>
    </div>
  );
};
