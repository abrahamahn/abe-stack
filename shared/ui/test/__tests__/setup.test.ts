// packages/ui/src/test/__tests__/setup.test.ts
import { describe, expect, it, vi } from 'vitest';

let beforeAllMock = vi.fn();
let afterEachMock = vi.fn();
let afterAllMock = vi.fn();
let cleanupMock = vi.fn();
let listenMock = vi.fn();
let resetHandlersMock = vi.fn();
let closeMock = vi.fn();

vi.mock('vitest', async () => {
  const actual = await vi.importActual<typeof import('vitest')>('vitest');

  return {
    ...actual,
    beforeAll: (callback: () => void) => {
      beforeAllMock(callback);
    },
    afterEach: (callback: () => void) => {
      afterEachMock(callback);
    },
    afterAll: (callback: () => void) => {
      afterAllMock(callback);
    },
  };
});

vi.mock('@testing-library/react', async () => {
  const actual =
    await vi.importActual<typeof import('@testing-library/react')>('@testing-library/react');

  return {
    ...actual,
    cleanup: cleanupMock,
  };
});

vi.mock('../mocks/server', () => ({
  server: {
    listen: (...args: Array<unknown>) => listenMock(...args),
    resetHandlers: (...args: Array<unknown>) => resetHandlersMock(...args),
    close: (...args: Array<unknown>) => closeMock(...args),
  },
}));

describe('test setup', () => {
  it('registers MSW lifecycle hooks and cleanup', async () => {
    beforeAllMock = vi.fn();
    afterEachMock = vi.fn();
    afterAllMock = vi.fn();
    cleanupMock = vi.fn();
    listenMock = vi.fn();
    resetHandlersMock = vi.fn();
    closeMock = vi.fn();

    vi.resetModules();
    await import('../setup');

    expect(beforeAllMock).toHaveBeenCalledTimes(1);
    expect(afterEachMock).toHaveBeenCalledTimes(1);
    expect(afterAllMock).toHaveBeenCalledTimes(1);

    const beforeAllCallback = beforeAllMock.mock.calls[0]?.[0];
    const afterEachCallback = afterEachMock.mock.calls[0]?.[0];
    const afterAllCallback = afterAllMock.mock.calls[0]?.[0];

    if (!beforeAllCallback || !afterEachCallback || !afterAllCallback) {
      throw new Error('Expected test setup hooks to be registered.');
    }

    beforeAllCallback();
    expect(listenMock).toHaveBeenCalledWith({ onUnhandledRequest: 'warn' });

    afterEachCallback();
    expect(cleanupMock).toHaveBeenCalledTimes(1);
    expect(resetHandlersMock).toHaveBeenCalledTimes(1);

    afterAllCallback();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
