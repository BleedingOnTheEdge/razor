import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Polyfill global fetch if needed
if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = vi.fn();
}

// Mock window.scrollTo
if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = vi.fn();
}
