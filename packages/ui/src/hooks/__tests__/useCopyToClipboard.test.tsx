// packages/ui/src/hooks/__tests__/useCopyToClipboard.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCopyToClipboard } from '../useCopyToClipboard';

import type { ReactElement } from 'react';

function CopyHarness(): ReactElement {
  const { copied, copy, error } = useCopyToClipboard();
  return (
    <div>
      <span data-testid="copied">{String(copied)}</span>
      <span data-testid="error">{error ? error.message : ''}</span>
      <button
        type="button"
        onClick={() => {
          void copy('hello');
        }}
      >
        Copy
      </button>
    </div>
  );
}

describe('useCopyToClipboard', () => {
  it('returns an error when clipboard API is unavailable', async () => {
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

    render(<CopyHarness />);
    await act(async () => {
      fireEvent.click(screen.getByText('Copy'));
      await Promise.resolve();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Clipboard API not available');
    expect(screen.getByTestId('copied')).toHaveTextContent('false');

    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
  });

  it('sets copied true and resets it after timeout', async () => {
    vi.useFakeTimers();
    const originalClipboard = navigator.clipboard;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<CopyHarness />);
    await act(async () => {
      fireEvent.click(screen.getByText('Copy'));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith('hello');
    expect(screen.getByTestId('copied')).toHaveTextContent('true');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('copied')).toHaveTextContent('false');

    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
    vi.useRealTimers();
  });
});
