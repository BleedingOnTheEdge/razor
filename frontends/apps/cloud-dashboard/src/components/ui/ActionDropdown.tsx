'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setIsOpen(false), []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 192; // 48 * 4px = 12rem = 192px

    let left = align === 'right' ? rect.right - menuWidth : rect.left;
    if (typeof window !== 'undefined') {
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      if (left < 8) {
        left = 8;
      }
    }
    const top = rect.bottom + 4;
    setMenuPos({ top, left });
  }, [align]);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        updatePosition();
      }
      return next;
    });
  }, [updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        closeDropdown();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    }

    function handleScrollOrResize() {
      updatePosition();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, closeDropdown, updatePosition]);

  const visibleItems = items.filter(Boolean);

  const menuContent = isOpen && typeof document !== 'undefined' ? (
    createPortal(
      <div
        ref={menuRef}
        role="menu"
        aria-orientation="vertical"
        style={{
          position: 'fixed',
          top: `${menuPos.top}px`,
          left: `${menuPos.left}px`,
          zIndex: 9999,
        }}
        className="w-48 bg-white border border-black divide-y divide-black animate-in fade-in zoom-in-95 duration-100 shadow-md font-mono text-xs select-none"
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
      </div>,
      document.body
    )
  ) : null;

  return (
    <div ref={triggerRef} className={`relative inline-block text-left font-mono text-xs ${className}`}>
      {trigger ? (
        <div onClick={toggleDropdown} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={toggleDropdown}
          aria-haspopup="true"
          aria-expanded={isOpen}
          className="px-2.5 py-1 border border-black bg-white hover:bg-black hover:text-white text-black font-bold transition-colors select-none flex items-center gap-1"
        >
          <span>{label}</span>
        </button>
      )}
      {menuContent}
    </div>
  );
}
