/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Dialog } from '../Dialog';

describe('Dialog', () => {
  it('applies accessible labelling from title and description', async () => {
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Title>Dialog Title</Dialog.Title>
          <Dialog.Description>Dialog Description</Dialog.Description>
          <button type="button">Confirm</button>
        </Dialog.Content>
      </Dialog.Root>,
    );

    const dialog = screen.getByRole('dialog');
    const title = screen.getByText('Dialog Title');
    const description = screen.getByText('Dialog Description');

    await waitFor(() => {
      expect(dialog).toHaveAttribute('aria-labelledby', title.getAttribute('id'));
      expect(dialog).toHaveAttribute('aria-describedby', description.getAttribute('id'));
    });
  });

  it('opens via trigger and closes via overlay/close button', () => {
    render(
      <Dialog.Root>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Content title="Title">
          <Dialog.Description>Description</Dialog.Description>
          Body
        </Dialog.Content>
      </Dialog.Root>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Open'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();

    // Close via overlay
    const overlay = document.querySelector('.ui-overlay');
    expect(overlay).not.toBeNull();
    if (overlay) {
      fireEvent.click(overlay);
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when the close button is clicked', () => {
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Content title="Title">Body</Dialog.Content>
      </Dialog.Root>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape when enabled', () => {
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Content title="Title">Body</Dialog.Content>
      </Dialog.Root>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('focuses the first focusable element and restores focus to the trigger on close', () => {
    render(
      <Dialog.Root>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Content title="Title">
          <button type="button">Primary Action</button>
        </Dialog.Content>
      </Dialog.Root>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus();
    fireEvent.click(trigger);

    const action = screen.getByRole('button', { name: 'Primary Action' });
    expect(action).toHaveFocus();

    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(trigger).toHaveFocus();
  });
});
