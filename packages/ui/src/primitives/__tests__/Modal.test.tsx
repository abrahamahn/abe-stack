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
    const { container } = render(
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

    const overlay = container.querySelector('.ui-overlay');
    expect(overlay).toBeInTheDocument();
    if (overlay) {
      fireEvent.click(overlay);
    }
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
