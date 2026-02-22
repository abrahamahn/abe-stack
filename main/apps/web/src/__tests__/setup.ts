// main/apps/web/src/__tests__/setup.ts
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { installBrowserMocks } from './mocks/browser';
import { installCanvasMock } from './mocks/canvas';
import { installJsdomNoiseFilter } from './mocks/console';

installBrowserMocks();
installCanvasMock();

const defaultFetchMock = vi.fn(() =>
  Promise.reject(new Error('Fetch not mocked. Please mock fetch in your test.')),
);
vi.stubGlobal('fetch', defaultFetchMock);

if (document.getElementById('root') === null) {
  const rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
}

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

let restoreConsoleError: (() => void) | undefined;

beforeAll(() => {
  restoreConsoleError = installJsdomNoiseFilter();
});

beforeEach(() => {
  vi.stubGlobal('fetch', defaultFetchMock);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

afterAll(() => {
  restoreConsoleError?.();
});
