// packages/ui/src/test/mocks/__tests__/server.test.ts
import { describe, expect, it, vi } from 'vitest';

let setupServerMock = vi.fn();
let handlersStub: Array<unknown> = [];

vi.mock('msw/node', () => ({
  setupServer: (...args: Array<unknown>) => setupServerMock(...args),
}));

vi.mock('../handlers', () => ({
  handlers: handlersStub,
}));

describe('server', () => {
  it('registers handlers with MSW setupServer', async () => {
    setupServerMock = vi.fn();
    handlersStub = [{ type: 'handler' }];

    setupServerMock.mockReturnValue({
      listen: vi.fn(),
      resetHandlers: vi.fn(),
      close: vi.fn(),
    });

    vi.resetModules();
    const { server } = await import('../server');

    expect(setupServerMock).toHaveBeenCalledTimes(1);
    expect(setupServerMock).toHaveBeenCalledWith(...handlersStub);
    expect(server).toBeDefined();
  });
});
