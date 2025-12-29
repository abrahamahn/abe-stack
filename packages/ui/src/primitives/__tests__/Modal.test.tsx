/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from '../Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal.Root open={false}>
        <Modal.Body>Hidden</Modal.Body>
      </Modal.Root>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows dialog when open and closes on overlay click', () => {
    const handleClose = vi.fn();
    render(
      <Modal.Root open onClose={handleClose}>
        <Modal.Header>
          <span>Hello</span>
        </Modal.Header>
        <Modal.Body>Content</Modal.Body>
      </Modal.Root>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();

    const overlay = document.body.querySelector('.ui-overlay');
    expect(overlay).toBeInTheDocument();
    if (overlay) {
      fireEvent.click(overlay);
    }
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape when onClose is provided', () => {
    const handleClose = vi.fn();
    render(
      <Modal.Root open onClose={handleClose}>
        <Modal.Body>Content</Modal.Body>
      </Modal.Root>,
    );

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('wires up aria-labelledby/aria-describedby and moves focus inside', () => {
    render(
      <Modal.Root open>
        <Modal.Header>
          <Modal.Title>Modal Title</Modal.Title>
        </Modal.Header>
        <Modal.Description>Modal Description</Modal.Description>
        <Modal.Body>
          <button type="button">Continue</button>
        </Modal.Body>
      </Modal.Root>,
    );

    const dialog = screen.getByRole('dialog');
    const title = screen.getByText('Modal Title');
    const description = screen.getByText('Modal Description');

    expect(dialog).toHaveAttribute('aria-labelledby', title.getAttribute('id'));
    expect(dialog).toHaveAttribute('aria-describedby', description.getAttribute('id'));
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
  });
});
