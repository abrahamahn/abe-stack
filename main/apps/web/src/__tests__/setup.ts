// apps/web/src/__tests__/setup.ts
/**
 * Global test setup for web application tests.
 *
 * This file is loaded before each test file and provides:
 * - Jest DOM matchers for vitest
 * - Global browser API mocks (matchMedia, ResizeObserver, IntersectionObserver)
 * - Fetch mock setup via vi.stubGlobal
 * - DOM cleanup after each test
 * - Root element for main.tsx tests
 *
 * @module test-setup
 */
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

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
    // Immediately call callback with empty entries to simulate initial observation
    // This prevents "ResizeObserver is not defined" errors in tests
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
    // No-op for tests - components should handle the case where callback isn't called
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
// Fetch Mock Setup
// ============================================================================

/**
 * Default fetch mock that rejects with a helpful error.
 * Individual tests should mock fetch for their specific needs.
 *
 * Usage in tests:
 * ```typescript
 * vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
 *   ok: true,
 *   json: () => Promise.resolve({ data: 'test' }),
 * }));
 * ```
 */
const defaultFetchMock = vi.fn(() =>
  Promise.reject(new Error('Fetch not mocked. Please mock fetch in your test.')),
);

vi.stubGlobal('fetch', defaultFetchMock);

// ============================================================================
// DOM Setup
// ============================================================================

/**
 * Create root element for main.tsx tests.
 * This must exist before main.tsx is imported.
 */
if (document.getElementById('root') === null) {
  const rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
}

// ============================================================================
// Module Mocks
// ============================================================================

vi.mock('@ui-library/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ui-library/hooks')>();
  return {
    ...actual,
    useUILibraryPanes: vi.fn(() => ({
      paneConfig: {
        top: { visible: true, size: 6 },
        left: { visible: true, size: 18 },
        right: { visible: true, size: 25 },
        bottom: { visible: true, size: 8 },
      },
      togglePane: vi.fn(),
      handlePaneResize: vi.fn(),
      resetLayout: vi.fn(),
    })),
  };
});

// ============================================================================
// Test Lifecycle Hooks
// ============================================================================

beforeEach(() => {
  // Reset fetch mock to default behavior before each test
  // Tests that need fetch should override this
  vi.stubGlobal('fetch', defaultFetchMock);
});

afterEach(() => {
  // Clean up React Testing Library DOM
  cleanup();

  // Clear all mocks to prevent state leakage between tests
  vi.clearAllMocks();

  // Reset timers if any test used fake timers
  vi.useRealTimers();
});
