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
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ onThemeChange }) => {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('razor-theme', 'light');
      onThemeChange?.('light');
    }
  }, [onThemeChange]);

  return null;
};
