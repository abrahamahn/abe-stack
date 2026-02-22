// main/client/react/src/__tests__/setup.ts
/**
 * Global test setup for @bslt/react package tests.
 *
 * This file is loaded before each test file and provides:
 * - Jest DOM matchers for vitest (via /vitest entry point)
 * - Global browser API mocks (matchMedia, ResizeObserver, IntersectionObserver, scrollTo)
 * - DOM cleanup after each test
 * - Mock and timer state reset after each test
 *
 * @module test-setup
 */
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

// ============================================================================
// Browser API Mocks
// ============================================================================

/**
 * Mock window.matchMedia for responsive design tests.
 * Returns a MediaQueryList that always reports false for matches.
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }),
});

/**
 * Mock ResizeObserver for components that observe element size changes.
 */
class MockResizeObserver {
  observe(): void {
    // No-op for tests
  }

  unobserve(): void {
    // No-op for tests
  }

  disconnect(): void {
    // No-op for tests
  }
}

vi.stubGlobal('ResizeObserver', MockResizeObserver);

/**
 * Mock IntersectionObserver for lazy loading and visibility detection.
 */
class MockIntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: readonly number[] = [0];

  observe(): void {
    // No-op for tests
  }

  unobserve(): void {
    // No-op for tests
  }

  disconnect(): void {
    // No-op for tests
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

/**
 * Mock canvas context to avoid jsdom "Not implemented: HTMLCanvasElement.getContext" noise.
 */
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: [] })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: [] })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  })),
});

/**
 * Mock scrollTo for scroll-related tests.
 */
vi.stubGlobal(
  'scrollTo',
  vi.fn(() => {
    // No-op for tests
  }),
);

/**
 * Mock window.scroll for scroll-related tests.
 */
Object.defineProperty(window, 'scroll', {
  writable: true,
  value: vi.fn(),
});

// ============================================================================
// DOM Setup
// ============================================================================

/**
 * Create root element for rendering tests.
 * This must exist before any component is imported that needs a root.
 */
if (document.getElementById('root') === null) {
  const rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
}

// Keep test output clean from known jsdom unimplemented browser APIs.
let restoreConsoleError: (() => void) | undefined;

beforeAll(() => {
  const original = console.error.bind(console);
  const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const first = args[0];
    const msg = typeof first === 'string' ? first : '';
    if (
      msg.includes("Not implemented: HTMLCanvasElement's getContext() method") ||
      msg.includes('Not implemented: navigation to another Document')
    ) {
      return;
    }
    original(...args);
  });
  restoreConsoleError = () => spy.mockRestore();
});

// ============================================================================
// Test Lifecycle Hooks
// ============================================================================

afterEach(() => {
  // Clean up React Testing Library DOM
  cleanup();

  // Clear all mocks to prevent state leakage between tests
  vi.clearAllMocks();

  // Reset timers if any test used fake timers
  vi.useRealTimers();
});

afterAll(() => {
  restoreConsoleError?.();
});
