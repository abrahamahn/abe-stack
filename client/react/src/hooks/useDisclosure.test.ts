// client/ui/src/hooks/useDisclosure.test.ts
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import react from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useDisclosure } from './useDisclosure';

const DisclosureHarness = (props: {
  open?: boolean;
  defaultOpen?: boolean;
  onChange?: (open: boolean) => void;
}): react.ReactElement => {
  const { open, defaultOpen, onChange } = props;
  const {
    open: isOpen,
    openFn,
    close,
    toggle,
  } = useDisclosure({
    ...(open !== undefined && { open }),
    ...(defaultOpen !== undefined && { defaultOpen }),
    ...(onChange !== undefined && { onChange }),
  });
  return react.createElement(
    'div',
    null,
    react.createElement('span', { 'data-testid': 'state' }, String(isOpen)),
    react.createElement('button', { type: 'button', onClick: openFn }, 'Open'),
    react.createElement('button', { type: 'button', onClick: close }, 'Close'),
    react.createElement('button', { type: 'button', onClick: toggle }, 'Toggle'),
  );
};
describe('useDisclosure', () => {
  it('toggles open state when uncontrolled', () => {
    render(react.createElement(DisclosureHarness, { defaultOpen: false }));
    expect(screen.getByTestId('state')).toHaveTextContent('false');
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('state')).toHaveTextContent('true');
    fireEvent.click(screen.getByText('Close'));
    expect(screen.getByTestId('state')).toHaveTextContent('false');
  });
  it('calls onChange for controlled state changes', () => {
    const onChange = vi.fn();
    render(react.createElement(DisclosureHarness, { open: false, onChange: onChange }));
    fireEvent.click(screen.getByText('Toggle'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
  it('respects defaultOpen when uncontrolled', () => {
    render(react.createElement(DisclosureHarness, { defaultOpen: true }));
    expect(screen.getByTestId('state')).toHaveTextContent('true');
  });
  it('toggles controlled state without mutating UI', () => {
    const onChange = vi.fn();
    render(react.createElement(DisclosureHarness, { open: true, onChange: onChange }));
    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('state')).toHaveTextContent('true');
    expect(onChange).toHaveBeenCalledWith(false);
  });
  it('supports direct setOpen calls', () => {
    const onChange = vi.fn();
    render(react.createElement(DisclosureHarness, { defaultOpen: false, onChange: onChange }));
    fireEvent.click(screen.getByText('Open'));
    fireEvent.click(screen.getByText('Close'));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
