// client/ui/src/__tests__/setup.ts
/**
 * Global test setup for @abe-stack/ui package tests.
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
import { afterEach, vi } from 'vitest';

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
