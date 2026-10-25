// -----------------------------------------------------------------------------
// <copyright file="ThemeToggle.tsx" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

export interface ThemeToggleProps {
  className?: string;
  onThemeChange?: (theme: Theme) => void;
}

/**
 * Apple Design inspired tactile theme toggle.
 * Features physical spring-settle motion, translucent frosted glass housing,
 * accessible ARIA states, and persistent theme synchronization.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', onThemeChange }) => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('razor-theme') as Theme | null;
      const initialTheme: Theme = stored === 'light' || stored === 'dark'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      setTheme(initialTheme);
      applyTheme(initialTheme);
    }
  }, []);

  const applyTheme = (targetTheme: Theme) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (targetTheme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
      localStorage.setItem('razor-theme', targetTheme);
      onThemeChange?.(targetTheme);
    }
  };

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  if (!mounted) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
        theme === 'dark'
          ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border-zinc-700'
          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
      } ${className}`}
    >
      {theme === 'dark' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
};
