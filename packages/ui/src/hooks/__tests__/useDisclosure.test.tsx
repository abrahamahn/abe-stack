// packages/ui/src/hooks/__tests__/useDisclosure.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDisclosure } from '../useDisclosure';

import type { ReactElement } from 'react';

function DisclosureHarness(props: {
  open?: boolean;
  defaultOpen?: boolean;
  onChange?: (open: boolean) => void;
}): ReactElement {
  const { open, defaultOpen, onChange } = props;
  const {
    open: isOpen,
    openFn,
    close,
    toggle,
  } = useDisclosure({
    open,
    defaultOpen,
    onChange,
  });

  return (
    <div>
      <span data-testid="state">{String(isOpen)}</span>
      <button type="button" onClick={openFn}>
        Open
      </button>
      <button type="button" onClick={close}>
        Close
      </button>
      <button type="button" onClick={toggle}>
        Toggle
      </button>
    </div>
  );
}

describe('useDisclosure', () => {
  it('toggles open state when uncontrolled', () => {
    render(<DisclosureHarness defaultOpen={false} />);
    expect(screen.getByTestId('state')).toHaveTextContent('false');

    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('state')).toHaveTextContent('true');

    fireEvent.click(screen.getByText('Close'));
    expect(screen.getByTestId('state')).toHaveTextContent('false');
  });

  it('calls onChange for controlled state changes', () => {
    const onChange = vi.fn();
    render(<DisclosureHarness open={false} onChange={onChange} />);

    fireEvent.click(screen.getByText('Toggle'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
