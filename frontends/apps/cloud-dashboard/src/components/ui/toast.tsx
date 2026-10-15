'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => showToast('success', title, message), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast('error', title, message), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast('info', title, message), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      {/* Toast viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-white/95 border-emerald-500/40 text-emerald-950 dark:bg-zinc-900/95 dark:border-emerald-500/30 dark:text-zinc-100 shadow-emerald-500/10'
                : toast.type === 'error'
                ? 'bg-white/95 border-rose-500/40 text-rose-950 dark:bg-zinc-900/95 dark:border-rose-500/30 dark:text-zinc-100 shadow-rose-500/10'
                : 'bg-white/95 border-cyan-500/40 text-cyan-950 dark:bg-zinc-900/95 dark:border-cyan-500/30 dark:text-zinc-100 shadow-cyan-500/10'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold font-mono tracking-tight text-zinc-900 dark:text-white">{toast.title}</p>
              {toast.message && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 break-words">{toast.message}</p>}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      success: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}
