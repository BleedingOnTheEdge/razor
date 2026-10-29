import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';

export type Theme = 'dark' | 'light';

export interface ThemeToggleProps {
  className?: string;
  onThemeChange?: (theme: Theme) => void;
}

/**
 * Supabase-style dark-mode-native theme toggle using Lucide icons.
 * Features near-black housing (#171717), accessible ARIA states,
 * and persistent theme synchronization.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', onThemeChange }) => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('razor-theme') as Theme | null;
      const initialTheme: Theme =
        stored === 'light' || stored === 'dark'
          ? stored
          : 'dark'; // Dark-mode native default
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
      className={cn(
        'inline-flex items-center justify-center p-2 rounded-lg transition-colors border',
        'bg-[#171717] hover:bg-[#222222] border-[#262626] hover:border-[#383838]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3ECF8E]',
        theme === 'dark' ? 'text-amber-400' : 'text-zinc-300',
        className
      )}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
};
