// packages/ui/src/hooks/__tests__/useControllableState.test.tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useControllableState } from '../useControllableState';

import type { ReactElement } from 'react';

function ControllableStateHarness(props: {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
}): ReactElement {
  const { value, defaultValue, onChange } = props;
  const [state, setState] = useControllableState<number>({
    value,
    defaultValue,
    onChange,
  });

  return (
    <div>
      <span data-testid="value">{String(state)}</span>
      <button
        type="button"
        onClick={() => {
          setState((state ?? 0) + 1);
        }}
      >
        Increment
      </button>
    </div>
  );
}

describe('useControllableState', () => {
  it('uses defaultValue when uncontrolled', () => {
    render(<ControllableStateHarness defaultValue={2} />);
    expect(screen.getByTestId('value')).toHaveTextContent('2');
  });

  it('updates internal state when uncontrolled', () => {
    const onChange = vi.fn();
    render(<ControllableStateHarness defaultValue={0} onChange={onChange} />);

    fireEvent.click(screen.getByText('Increment'));
    expect(screen.getByTestId('value')).toHaveTextContent('1');
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('does not mutate internal state when controlled', () => {
    const onChange = vi.fn();
    render(<ControllableStateHarness value={5} onChange={onChange} />);

    fireEvent.click(screen.getByText('Increment'));
    expect(screen.getByTestId('value')).toHaveTextContent('5');
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('reflects controlled value changes from the parent', () => {
    const { rerender } = render(<ControllableStateHarness value={1} />);
    expect(screen.getByTestId('value')).toHaveTextContent('1');

    rerender(<ControllableStateHarness value={9} />);
    expect(screen.getByTestId('value')).toHaveTextContent('9');
  });

  it('updates with undefined default value', () => {
    render(<ControllableStateHarness />);
    expect(screen.getByTestId('value')).toHaveTextContent('undefined');

    fireEvent.click(screen.getByText('Increment'));
    expect(screen.getByTestId('value')).toHaveTextContent('1');
  });
});
