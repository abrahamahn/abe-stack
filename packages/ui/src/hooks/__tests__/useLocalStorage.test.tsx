// packages/ui/src/hooks/__tests__/useLocalStorage.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useLocalStorage } from '../useLocalStorage';

import type { ReactElement } from 'react';

function LocalStorageHarness(props: { storageKey: string; initialValue: string }): ReactElement {
  const [value, setValue] = useLocalStorage<string>(props.storageKey, props.initialValue);
  return (
    <div>
      <span data-testid="value">{value}</span>
      <button
        type="button"
        onClick={() => {
          setValue('next');
        }}
      >
        Set
      </button>
    </div>
  );
}

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('reads initial value from localStorage when present', () => {
    window.localStorage.setItem('key', JSON.stringify('stored'));
    render(<LocalStorageHarness storageKey="key" initialValue="initial" />);
    expect(screen.getByTestId('value')).toHaveTextContent('stored');
  });

  it('writes updates to localStorage', () => {
    render(<LocalStorageHarness storageKey="write-key" initialValue="initial" />);
    fireEvent.click(screen.getByText('Set'));
    expect(window.localStorage.getItem('write-key')).toBe(JSON.stringify('next'));
  });

  it('responds to storage events from other tabs', () => {
    render(<LocalStorageHarness storageKey="sync-key" initialValue="initial" />);
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'sync-key',
          newValue: JSON.stringify('synced'),
        }),
      );
    });
    expect(screen.getByTestId('value')).toHaveTextContent('synced');
  });

  it('falls back to initial value on invalid JSON', () => {
    window.localStorage.setItem('bad-key', '{nope');
    render(<LocalStorageHarness storageKey="bad-key" initialValue="initial" />);
    expect(screen.getByTestId('value')).toHaveTextContent('initial');
  });
});
