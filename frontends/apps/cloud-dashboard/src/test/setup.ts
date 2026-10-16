import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Polyfill global fetch if needed
if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = vi.fn();
}

// Mock EventSource
if (!globalThis.EventSource) {
  // @ts-ignore
  globalThis.EventSource = vi.fn().mockImplementation(() => ({
    close: vi.fn(),
    onopen: null,
    onmessage: null,
    onerror: null,
  }));
}

// Mock window.matchMedia
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
