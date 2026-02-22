// main/client/react/src/__tests__/setup.ts
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { installBrowserMocks } from './mocks/browser';
import { installCanvasMock } from './mocks/canvas';
import { installJsdomNoiseFilter } from './mocks/console';

installBrowserMocks();
installCanvasMock();

if (document.getElementById('root') === null) {
  const rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
}

let restoreConsoleError: (() => void) | undefined;

beforeAll(() => {
  restoreConsoleError = installJsdomNoiseFilter();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

afterAll(() => {
  restoreConsoleError?.();
});
