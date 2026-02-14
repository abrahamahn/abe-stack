// main/client/ui/src/elements/CloseButton.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { CloseButton } from './CloseButton';

describe('CloseButton', () => {
  it('renders with default × symbol', () => {
    render(<CloseButton />);

    expect(screen.getByRole('button')).toHaveTextContent('✕');
  });

  it('renders custom children', () => {
    render(<CloseButton>Close</CloseButton>);

    expect(screen.getByRole('button')).toHaveTextContent('Close');
  });

  it('has default aria-label of "Close"', () => {
    render(<CloseButton />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close');
  });

  it('accepts custom aria-label', () => {
    render(<CloseButton aria-label="Dismiss" />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Dismiss');
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<CloseButton onClick={handleClick} />);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom styles', () => {
    render(<CloseButton style={{ marginTop: '10px' }} />);

    expect(screen.getByRole('button')).toHaveStyle({ marginTop: '10px' });
  });

  it('is a button with type="button"', () => {
    render(<CloseButton />);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('spreads additional props', () => {
    render(<CloseButton data-testid="close-btn" title="Close panel" />);

    const button = screen.getByTestId('close-btn');
    expect(button).toHaveAttribute('title', 'Close panel');
  });
});
