// main/client/ui/src/components/Popover.test.tsx
// client/ui/src/elements/__tests__/Popover.test.tsx
/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Popover } from './Popover';

describe('Popover', () => {
  it('opens and closes on trigger click', async () => {
    const user = userEvent.setup();

    render(
      <Popover trigger={<span>Toggle</span>} aria-label="Toggle">
        Popover content
      </Popover>,
    );

    const trigger = screen.getByRole('button', { name: 'Toggle' });
    expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(screen.getByText('Popover content')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(trigger);
    expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape key and returns focus to trigger', async () => {
    const user = userEvent.setup();

    render(
      <Popover trigger={<span>Show</span>} aria-label="Show">
        Content
      </Popover>,
    );

    const trigger = screen.getByRole('button', { name: 'Show' });
    await user.click(trigger);
    expect(screen.getByText('Content')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it('supports placement prop', async () => {
    const user = userEvent.setup();

    render(
      <Popover trigger={<span>Show</span>} placement="right" aria-label="Show">
        Content
      </Popover>,
    );

    await user.click(screen.getByRole('button', { name: 'Show' }));
    // The popover content has role="dialog"
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement', 'right');
  });

  it('works in controlled mode', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(
      <Popover trigger={<span>Show</span>} open={false} onChange={onChange} aria-label="Show">
        Content
      </Popover>,
    );

    expect(screen.queryByText('Content')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show' }));
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(
      <Popover trigger={<span>Show</span>} open={true} onChange={onChange} aria-label="Show">
        Content
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  it('supports keyboard activation with Enter and Space', async () => {
    const user = userEvent.setup();

    render(
      <Popover trigger={<span>Show</span>} aria-label="Show">
        Content
      </Popover>,
    );

    const trigger = screen.getByRole('button', { name: 'Show' });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Content')).toBeInTheDocument();

    await user.keyboard(' ');
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('uses default aria-label when not provided', () => {
    render(<Popover trigger={<span>Menu</span>}>Content</Popover>);

    const trigger = screen.getByRole('button', { name: 'Toggle popover' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  });
});
