// main/client/ui/src/elements/Button.test.tsx
// client/ui/src/components/__tests__/Button.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('renders with default classes and type', () => {
    render(<Button>Click</Button>);

    const button = screen.getByRole('button', { name: 'Click' });
    expect(button).toHaveClass('btn');
    expect(button).toHaveClass('btn-primary');
    expect(button).toHaveClass('btn-medium');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('applies variant and size classes', () => {
    render(
      <Button variant="secondary" size="large">
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveClass('btn-secondary');
    expect(button).toHaveClass('btn-large');
  });

  it('renders as a custom element', () => {
    render(<Button as="a">Docs</Button>);

    const element = screen.getByText('Docs');
    expect(element.tagName.toLowerCase()).toBe('a');
    expect(element).toHaveClass('btn');
  });

  it('calls onClick when enabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Run</Button>);

    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Disabled
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('handles unsupported variant values without crashing', () => {
    expect(() => {
      render(<Button variant={'mystery' as unknown as 'primary'}>Mystery</Button>);
    }).not.toThrow();

    const button = screen.getByRole('button', { name: 'Mystery' });
    expect(button).toHaveClass('btn-mystery');
  });
});
