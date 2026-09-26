import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock performance.now for tests that might need it (or keep it if tests rely on actual)
// Usually better to leave performance.now unmocked unless time travel is needed, 
// but we mock matchMedia for components.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
