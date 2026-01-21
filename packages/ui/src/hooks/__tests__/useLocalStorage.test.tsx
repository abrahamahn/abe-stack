// packages/ui/src/hooks/__tests__/useLocalStorage.test.tsx
/** @vitest-environment jsdom */
import { useLocalStorage } from '@hooks/useLocalStorage';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('supports functional updates', () => {
    function FunctionalHarness(): ReactElement {
      const [value, setValue] = useLocalStorage<string>('fn-key', 'base');
      return (
        <button
          type="button"
          onClick={() => {
            setValue((prev) => `${prev}-next`);
          }}
        >
          {value}
        </button>
      );
    }

    render(<FunctionalHarness />);
    fireEvent.click(screen.getByText('base'));
    expect(screen.getByText('base-next')).toBeInTheDocument();
  });

  it('ignores storage events for other keys or null values', () => {
    render(<LocalStorageHarness storageKey="key-a" initialValue="initial" />);

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'key-b',
          newValue: JSON.stringify('other'),
        }),
      );
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'key-a',
          newValue: null,
        }),
      );
    });

    expect(screen.getByTestId('value')).toHaveTextContent('initial');
  });

  it('does not crash when localStorage throws', () => {
    const setItemMock = vi.fn(() => {
      throw new Error('Storage blocked');
    });
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    window.localStorage.setItem = setItemMock as unknown as (key: string, value: string) => void;

    render(<LocalStorageHarness storageKey="blocked-key" initialValue="initial" />);
    expect(() => {
      fireEvent.click(screen.getByText('Set'));
    }).not.toThrow();

    window.localStorage.setItem = originalSetItem;
  });
});
