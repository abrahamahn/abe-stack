// packages/ui/src/hooks/useControllableState.test.ts
/** @vitest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useControllableState } from './useControllableState';

const ControllableStateHarness = (props: {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
}): React.ReactElement => {
  const { value, defaultValue, onChange } = props;
  const [state, setState] = useControllableState<number>({
    ...(value !== undefined && { value }),
    ...(defaultValue !== undefined && { defaultValue }),
    ...(onChange !== undefined && { onChange }),
  });
  return React.createElement(
    'div',
    null,
    React.createElement('span', { 'data-testid': 'value' }, String(state)),
    React.createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          const currentValue: number = state ?? 0;
          setState(currentValue + 1);
        },
      },
      'Increment',
    ),
  );
};
describe('useControllableState', () => {
  it('uses defaultValue when uncontrolled', () => {
    render(React.createElement(ControllableStateHarness, { defaultValue: 2 }));
    expect(screen.getByTestId('value')).toHaveTextContent('2');
  });
  it('updates internal state when uncontrolled', () => {
    const onChange = vi.fn();
    render(React.createElement(ControllableStateHarness, { defaultValue: 0, onChange: onChange }));
    fireEvent.click(screen.getByText('Increment'));
    expect(screen.getByTestId('value')).toHaveTextContent('1');
    expect(onChange).toHaveBeenCalledWith(1);
  });
  it('does not mutate internal state when controlled', () => {
    const onChange = vi.fn();
    render(React.createElement(ControllableStateHarness, { value: 5, onChange: onChange }));
    fireEvent.click(screen.getByText('Increment'));
    expect(screen.getByTestId('value')).toHaveTextContent('5');
    expect(onChange).toHaveBeenCalledWith(6);
  });
  it('reflects controlled value changes from the parent', () => {
    const { rerender } = render(React.createElement(ControllableStateHarness, { value: 1 }));
    expect(screen.getByTestId('value')).toHaveTextContent('1');
    rerender(React.createElement(ControllableStateHarness, { value: 9 }));
    expect(screen.getByTestId('value')).toHaveTextContent('9');
  });
  it('updates with undefined default value', () => {
    render(React.createElement(ControllableStateHarness, null));
    expect(screen.getByTestId('value')).toHaveTextContent('undefined');
    fireEvent.click(screen.getByText('Increment'));
    expect(screen.getByTestId('value')).toHaveTextContent('1');
  });
});
