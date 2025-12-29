// packages/ui/src/primitives/__tests__/Toast.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Toast } from '../Toast';

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('dismisses after the provided duration', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const message = { id: 'toast-1', title: 'Saved' };

    render(<Toast message={message} duration={1200} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(onDismiss).toHaveBeenCalledWith('toast-1');
  });
});
