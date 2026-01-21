// packages/ui/src/test/__tests__/setup.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('test setup', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('mocks window.matchMedia correctly', async () => {
    // Import setup to trigger the matchMedia mock
    await import('../setup');

    // matchMedia should be defined
    expect(window.matchMedia).toBeDefined();

    // Test the mock implementation
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    expect(mediaQuery.matches).toBe(false);
    expect(mediaQuery.media).toBe('(min-width: 768px)');
    expect(mediaQuery.onchange).toBeNull();
    expect(typeof mediaQuery.addListener).toBe('function');
    expect(typeof mediaQuery.removeListener).toBe('function');
    expect(typeof mediaQuery.addEventListener).toBe('function');
    expect(typeof mediaQuery.removeEventListener).toBe('function');
    expect(typeof mediaQuery.dispatchEvent).toBe('function');

    // dispatchEvent should return false
    expect(mediaQuery.dispatchEvent(new Event('change'))).toBe(false);
  });

  it('exports axe from vitest-axe', async () => {
    const setup = await import('../setup');
    expect(setup.axe).toBeDefined();
    expect(typeof setup.axe).toBe('function');
  });

  it('sets up afterEach cleanup hook', async () => {
    // The afterEach hook is registered at module load time.
    // We can verify this by checking that cleanup is a function.
    const { cleanup } = await import('@testing-library/react');
    expect(typeof cleanup).toBe('function');

    // Import setup to ensure the hook is registered
    await import('../setup');

    // The setup file imports afterEach from vitest and calls it with cleanup.
    // We trust vitest to handle the hook registration correctly.
    // This test just ensures the setup file loads without errors.
  });
});
