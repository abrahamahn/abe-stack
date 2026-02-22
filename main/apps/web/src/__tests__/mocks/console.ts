// main/apps/web/src/__tests__/mocks/console.ts
import { vi } from 'vitest';

export function installJsdomNoiseFilter(): () => void {
  const original = console.error.bind(console);
  const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const first = args[0];
    const message =
      typeof first === 'string'
        ? first
        : first instanceof Error
          ? first.message
          : typeof (first as { message?: unknown })?.message === 'string'
            ? (first as { message: string }).message
            : '';

    if (
      message.includes("Not implemented: HTMLCanvasElement's getContext() method") ||
      message.includes('Not implemented: navigation to another Document')
    ) {
      return;
    }

    original(...args);
  });

  return () => spy.mockRestore();
}
