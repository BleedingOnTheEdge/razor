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
    const stored = localStorage.getItem('razor-theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      applyTheme(stored);
    } else {
      const prefersDark =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : true;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      applyTheme(initial);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('razor-theme', newTheme);
    onThemeChange?.(newTheme);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  if (!mounted) {
    return (
      <div
        className={`w-14 h-8 rounded-full bg-zinc-800/60 border border-zinc-700/50 ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      onClick={toggleTheme}
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1
        transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        backdrop-blur-md border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2
        active:scale-95
        ${isDark ? 'bg-zinc-900/80 border-zinc-700/60' : 'bg-zinc-200/80 border-zinc-300'}
        ${className}`}
    >
      <span className="sr-only">Toggle theme</span>
      <span
        className={`pointer-events-none flex h-6 w-6 transform items-center justify-center rounded-full shadow-md
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isDark ? 'translate-x-6 bg-zinc-800 text-amber-300 border border-zinc-700/80' : 'translate-x-0 bg-white text-amber-500 border border-zinc-200'}`}
      >
        {isDark ? (
          // Moon icon
          <svg
            className="h-3.5 w-3.5 fill-current"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          // Sun icon
          <svg
            className="h-3.5 w-3.5 fill-current"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
    </button>
  );
};
