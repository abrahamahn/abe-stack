// main/apps/web/src/app/components/NetworkStatus.test.tsx
/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { NetworkStatus } from './NetworkStatus';

// Mock toastStore
const mockShow = vi.fn();
vi.mock('@abe-stack/react', () => ({
  toastStore: {
    getState: () => ({ show: mockShow }),
  },
}));

describe('NetworkStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockShow.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing (returns null)', () => {
    const { container } = render(<NetworkStatus />);
    expect(container.innerHTML).toBe('');
  });

  it('shows offline toast after debounce', () => {
    render(<NetworkStatus />);

    window.dispatchEvent(new Event('offline'));

    // Not shown immediately
    expect(mockShow).not.toHaveBeenCalled();

    // Shown after debounce
    vi.advanceTimersByTime(2000);

    expect(mockShow).toHaveBeenCalledWith({
      title: 'You are offline',
      description: 'Check your internet connection',
      tone: 'warning',
    });
  });

  it('cancels offline toast if back online within debounce', () => {
    render(<NetworkStatus />);

    window.dispatchEvent(new Event('offline'));
    vi.advanceTimersByTime(1000);

    // Come back online before debounce fires
    window.dispatchEvent(new Event('online'));
    vi.advanceTimersByTime(2000);

    // No toast shown
    expect(mockShow).not.toHaveBeenCalled();
  });

  it('shows reconnect toast after being offline', () => {
    render(<NetworkStatus />);

    // Go offline and let debounce fire
    window.dispatchEvent(new Event('offline'));
    vi.advanceTimersByTime(2000);

    expect(mockShow).toHaveBeenCalledTimes(1);

    // Come back online
    window.dispatchEvent(new Event('online'));

    expect(mockShow).toHaveBeenCalledTimes(2);
    expect(mockShow).toHaveBeenLastCalledWith({
      title: 'Back online',
      description: 'Your connection has been restored',
      tone: 'success',
    });
  });

  it('cleans up event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<NetworkStatus />);

    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
