'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

export interface ActionDropdownItem {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}

export interface ActionDropdownProps {
  label?: string;
  trigger?: React.ReactNode;
  items: ActionDropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function ActionDropdown({
  label = '[ACTIONS ▾]',
  trigger,
  items,
  align = 'right',
  className = '',
}: ActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeDropdown]);

  const visibleItems = items.filter(Boolean);

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left font-mono text-xs ${className}`}>
      {trigger ? (
        <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          className="px-2.5 py-1 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors select-none flex items-center gap-1"
        >
          <span>{label}</span>
        </button>
      )}

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1 w-48 bg-white border border-black z-30 divide-y divide-black animate-in fade-in zoom-in-95 duration-100 shadow-none`}
        >
          {visibleItems.map((item, idx) => {
            const Icon = item.icon;
            const content = (
              <span className="flex items-center gap-2">
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span className={item.danger ? 'text-red-600 font-bold' : 'font-bold'}>
                  {item.label}
                </span>
              </span>
            );

            if (item.href && !item.disabled) {
              return (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={closeDropdown}
                  role="menuitem"
                  title={item.title}
                  className="block px-3 py-2 text-left bg-white text-black hover:bg-black hover:text-white transition-colors"
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  closeDropdown();
                  item.onClick?.();
                }}
                role="menuitem"
                title={item.title}
                className="w-full px-3 py-2 text-left bg-white text-black hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
