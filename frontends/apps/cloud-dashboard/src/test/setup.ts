import '@testing-library/jest-dom';
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
