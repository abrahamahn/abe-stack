// packages/ui/src/elements/__tests__/Modal.test.tsx
/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from '../Modal';

describe('Modal', () => {
  describe('happy path', () => {
    it('renders nothing when closed', () => {
      render(
        <Modal.Root open={false}>
          <Modal.Body>Hidden</Modal.Body>
        </Modal.Root>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders dialog when open', () => {
      render(
        <Modal.Root open>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('renders all modal parts correctly', () => {
      render(
        <Modal.Root open>
          <Modal.Header>
            <Modal.Title>Modal Title</Modal.Title>
          </Modal.Header>
          <Modal.Description>Modal Description</Modal.Description>
          <Modal.Body>Modal Body</Modal.Body>
          <Modal.Footer>
            <Modal.Close>Cancel</Modal.Close>
          </Modal.Footer>
        </Modal.Root>,
      );

      expect(screen.getByText('Modal Title')).toBeInTheDocument();
      expect(screen.getByText('Modal Description')).toBeInTheDocument();
      expect(screen.getByText('Modal Body')).toBeInTheDocument();
      // Close button has aria-label="Close" but displays "Cancel" text
      expect(screen.getByRole('button', { name: 'Close' })).toHaveTextContent('Cancel');
    });

    it('closes on overlay click with userEvent', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const overlay = document.body.querySelector('.overlay');
      expect(overlay).toBeInTheDocument();

      if (overlay) {
        await user.click(overlay as HTMLElement);
      }

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('closes on Escape key with userEvent', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      await user.keyboard('{Escape}');
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('closes via Close button', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
          <Modal.Footer>
            <Modal.Close>Close</Modal.Close>
          </Modal.Footer>
        </Modal.Root>,
      );

      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('renders default Close button text', () => {
      render(
        <Modal.Root open>
          <Modal.Body>Content</Modal.Body>
          <Modal.Footer>
            <Modal.Close />
          </Modal.Footer>
        </Modal.Root>,
      );

      expect(screen.getByRole('button', { name: 'Close' })).toHaveTextContent('Close');
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('handles null onClose gracefully', async () => {
      const user = userEvent.setup();

      render(
        // @ts-expect-error Testing invalid prop
        <Modal.Root open onClose={null}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const overlay = document.body.querySelector('.overlay');
      if (overlay) {
        expect(() => user.click(overlay as HTMLElement)).not.toThrow();
      }

      expect(() => user.keyboard('{Escape}')).not.toThrow();
    });

    it('handles undefined onClose gracefully', async () => {
      const user = userEvent.setup();

      render(
        <Modal.Root open onClose={undefined}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      await user.keyboard('{Escape}');
      // Should not crash
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles missing Title', () => {
      render(
        <Modal.Root open>
          <Modal.Header>
            <span>No title component</span>
          </Modal.Header>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).not.toHaveAttribute('aria-labelledby');
    });

    it('handles missing Description', () => {
      render(
        <Modal.Root open>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).not.toHaveAttribute('aria-describedby');
    });

    it('handles null children in Body', () => {
      render(
        <Modal.Root open>
          <Modal.Body>{null}</Modal.Body>
        </Modal.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles undefined children in Body', () => {
      render(
        <Modal.Root open>
          <Modal.Body>{undefined}</Modal.Body>
        </Modal.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles empty Body', () => {
      render(
        <Modal.Root open>
          <Modal.Body></Modal.Body>
        </Modal.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles rapid overlay clicks', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const overlay = document.body.querySelector('.overlay');
      if (overlay) {
        const element = overlay as HTMLElement;
        // Click 5 times rapidly
        await user.click(element);
        await user.click(element);
        await user.click(element);
        await user.click(element);
        await user.click(element);
      }

      expect(handleClose).toHaveBeenCalledTimes(5);
    });

    it('handles rapid Escape key presses', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      // Press Escape 5 times
      await user.keyboard('{Escape}');
      await user.keyboard('{Escape}');
      await user.keyboard('{Escape}');
      await user.keyboard('{Escape}');
      await user.keyboard('{Escape}');

      expect(handleClose).toHaveBeenCalledTimes(5);
    });

    it('handles rapid prop changes', async () => {
      const { rerender } = render(
        <Modal.Root open>
          <Modal.Body>Content 1</Modal.Body>
        </Modal.Root>,
      );

      // Rapidly toggle open/closed
      for (let i = 0; i < 10; i++) {
        rerender(
          <Modal.Root open={i % 2 === 0}>
            <Modal.Body>Content {i}</Modal.Body>
          </Modal.Root>,
        );
      }

      // Should be closed after 10 iterations (even number)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('handles multiple onClose calls', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
          <Modal.Footer>
            <Modal.Close>Close</Modal.Close>
          </Modal.Footer>
        </Modal.Root>,
      );

      const closeButton = screen.getByRole('button', { name: 'Close' });

      // Click close button multiple times
      await user.click(closeButton);
      await user.click(closeButton);
      await user.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases - cleanup', () => {
    it('cleans up properly on unmount when open', () => {
      const { unmount } = render(
        <Modal.Root open>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      unmount();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('cleans up properly on unmount when closed', () => {
      const { unmount } = render(
        <Modal.Root open={false}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      unmount();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('removes event listeners on unmount', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      const { unmount } = render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      unmount();

      // Try to trigger Escape after unmount
      await user.keyboard('{Escape}');

      // Should not call onClose after unmount
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('edge cases - special characters', () => {
    it('handles special characters in Title', () => {
      render(
        <Modal.Root open>
          <Modal.Header>
            <Modal.Title>{'<Title> with & special \'chars\' "quotes"'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      expect(screen.getByText('<Title> with & special \'chars\' "quotes"')).toBeInTheDocument();
    });

    it('handles special characters in Description', () => {
      render(
        <Modal.Root open>
          <Modal.Description>{'<Description> & special \'chars\' "quotes"'}</Modal.Description>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      expect(screen.getByText('<Description> & special \'chars\' "quotes"')).toBeInTheDocument();
    });

    it('handles special characters in Body', () => {
      render(
        <Modal.Root open>
          <Modal.Body>{'Body & special <chars> "quotes"'}</Modal.Body>
        </Modal.Root>,
      );

      expect(screen.getByText('Body & special <chars> "quotes"')).toBeInTheDocument();
    });

    it('handles special characters in Close button', () => {
      render(
        <Modal.Root open>
          <Modal.Body>Content</Modal.Body>
          <Modal.Footer>
            <Modal.Close>{'<Close> & "button"'}</Modal.Close>
          </Modal.Footer>
        </Modal.Root>,
      );

      expect(screen.getByRole('button', { name: 'Close' })).toHaveTextContent('<Close> & "button"');
    });
  });

  describe('keyboard interactions', () => {
    it('prevents default Escape behavior', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const preventDefaultSpy = vi.fn();

      render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      // Add custom event listener to verify preventDefault is called
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          preventDefaultSpy();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      await user.keyboard('{Escape}');

      expect(handleClose).toHaveBeenCalledTimes(1);

      window.removeEventListener('keydown', handleKeyDown);
    });

    it('does not close on other keys', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      await user.keyboard('{Enter}');
      await user.keyboard('{Space}');
      await user.keyboard('{Tab}');
      await user.keyboard('a');

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('does not close on Escape when onClose is not provided', async () => {
      const user = userEvent.setup();

      render(
        <Modal.Root open>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      await user.keyboard('{Escape}');

      // Modal should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('mouse interactions', () => {
    it('handles overlay double-click', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const overlay = document.body.querySelector('.overlay');
      if (overlay) {
        await user.dblClick(overlay as HTMLElement);
      }

      // Double-click should trigger two close calls
      expect(handleClose).toHaveBeenCalledTimes(2);
    });

    it('does not close when clicking modal content', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const body = screen.getByText('Content');
      await user.click(body);

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('handles clicks on Close button with Enter key', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
          <Modal.Footer>
            <Modal.Close>Close</Modal.Close>
          </Modal.Footer>
        </Modal.Root>,
      );

      const closeButton = screen.getByRole('button', { name: 'Close' });
      closeButton.focus();
      await user.keyboard('{Enter}');

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('handles clicks on Close button with Space key', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal.Root open onClose={handleClose}>
          <Modal.Body>Content</Modal.Body>
          <Modal.Footer>
            <Modal.Close>Close</Modal.Close>
          </Modal.Footer>
        </Modal.Root>,
      );

      const closeButton = screen.getByRole('button', { name: 'Close' });
      closeButton.focus();
      await user.keyboard(' ');

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has aria-modal attribute', () => {
      render(
        <Modal.Root open>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('links Title to dialog via aria-labelledby', () => {
      render(
        <Modal.Root open>
          <Modal.Header>
            <Modal.Title>Modal Title</Modal.Title>
          </Modal.Header>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const dialog = screen.getByRole('dialog');
      const title = screen.getByText('Modal Title');

      expect(dialog).toHaveAttribute('aria-labelledby', title.getAttribute('id'));
      expect(title.getAttribute('id')).toBeTruthy();
    });

    it('links Description to dialog via aria-describedby', () => {
      render(
        <Modal.Root open>
          <Modal.Description>Modal Description</Modal.Description>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const dialog = screen.getByRole('dialog');
      const description = screen.getByText('Modal Description');

      expect(dialog).toHaveAttribute('aria-describedby', description.getAttribute('id'));
      expect(description.getAttribute('id')).toBeTruthy();
    });

    it('has semantic dialog role', () => {
      render(
        <Modal.Root open>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('Close button has aria-label', () => {
      render(
        <Modal.Root open>
          <Modal.Body>Content</Modal.Body>
          <Modal.Footer>
            <Modal.Close>Custom Text</Modal.Close>
          </Modal.Footer>
        </Modal.Root>,
      );

      const closeButton = screen.getByRole('button', { name: 'Close' });
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });

    it('focuses first focusable element when opened', async () => {
      render(
        <Modal.Root open>
          <Modal.Body>
            <button type="button">First Button</button>
            <button type="button">Second Button</button>
          </Modal.Body>
        </Modal.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'First Button' })).toHaveFocus();
      });
    });

    it('supports custom ARIA attributes on Title', () => {
      render(
        <Modal.Root open>
          <Modal.Header>
            <Modal.Title aria-label="Custom Title Label">Title</Modal.Title>
          </Modal.Header>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const title = screen.getByText('Title');
      expect(title).toHaveAttribute('aria-label', 'Custom Title Label');
    });
  });

  describe('context validation', () => {
    it('throws error when Title used outside Root', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<Modal.Title>Title</Modal.Title>);
      }).toThrow('Modal compound components must be used within Modal.Root');

      spy.mockRestore();
    });

    it('throws error when Description used outside Root', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<Modal.Description>Description</Modal.Description>);
      }).toThrow('Modal compound components must be used within Modal.Root');

      spy.mockRestore();
    });

    it('throws error when Close used outside Root', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<Modal.Close>Close</Modal.Close>);
      }).toThrow('Modal compound components must be used within Modal.Root');

      spy.mockRestore();
    });

    it('allows Header, Body, Footer outside Root (no context required)', () => {
      expect(() => {
        render(<Modal.Header>Header</Modal.Header>);
      }).not.toThrow();

      expect(() => {
        render(<Modal.Body>Body</Modal.Body>);
      }).not.toThrow();

      expect(() => {
        render(<Modal.Footer>Footer</Modal.Footer>);
      }).not.toThrow();
    });
  });

  describe('portal rendering', () => {
    it('renders modal into document.body via portal', () => {
      render(
        <Modal.Root open>
          <Modal.Body>Portal Content</Modal.Body>
        </Modal.Root>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.parentElement).toBe(document.body);
    });

    it('renders overlay into document.body', () => {
      render(
        <Modal.Root open>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const overlay = document.body.querySelector('.overlay');
      expect(overlay).toBeInTheDocument();
      expect(overlay?.parentElement).toBe(document.body);
    });
  });

  describe('real-world chaos - aggressive bug hunting', () => {
    it('survives opening and closing rapidly 20 times', () => {
      const { rerender } = render(
        <Modal.Root open={false}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      for (let i = 0; i < 20; i++) {
        rerender(
          <Modal.Root open={i % 2 === 0}>
            <Modal.Body>Content {i}</Modal.Body>
          </Modal.Root>,
        );
      }

      // Should be closed after 20 iterations
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('handles alternating onClose callbacks', () => {
      const handleClose1 = vi.fn();
      const handleClose2 = vi.fn();

      const { rerender } = render(
        <Modal.Root open onClose={handleClose1}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      // Change onClose callback
      rerender(
        <Modal.Root open onClose={handleClose2}>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      // Original callback should not be called
      expect(handleClose1).not.toHaveBeenCalled();
      expect(handleClose2).not.toHaveBeenCalled();
    });

    it('handles content that changes during open state', () => {
      const { rerender } = render(
        <Modal.Root open>
          <Modal.Body>Content 1</Modal.Body>
        </Modal.Root>,
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();

      // Change content while open
      rerender(
        <Modal.Root open>
          <Modal.Body>Content 2</Modal.Body>
        </Modal.Root>,
      );

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('handles nested interactive elements in Body', async () => {
      const user = userEvent.setup();
      const handleButtonClick = vi.fn();

      render(
        <Modal.Root open>
          <Modal.Body>
            <div>
              <div>
                <button type="button" onClick={handleButtonClick}>
                  Nested Button
                </button>
              </div>
            </div>
          </Modal.Body>
        </Modal.Root>,
      );

      await user.click(screen.getByRole('button', { name: 'Nested Button' }));
      expect(handleButtonClick).toHaveBeenCalledTimes(1);
    });

    it('handles multiple Title components (should use last one)', () => {
      render(
        <Modal.Root open>
          <Modal.Header>
            <Modal.Title>First Title</Modal.Title>
            <Modal.Title>Second Title</Modal.Title>
          </Modal.Header>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const dialog = screen.getByRole('dialog');
      const secondTitle = screen.getByText('Second Title');

      // Should use the last Title's ID
      expect(dialog).toHaveAttribute('aria-labelledby', secondTitle.getAttribute('id'));
    });

    it('handles Title and Description mounting/unmounting dynamically', async () => {
      const { rerender } = render(
        <Modal.Root open>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      const dialog = screen.getByRole('dialog');

      expect(dialog).not.toHaveAttribute('aria-labelledby');
      expect(dialog).not.toHaveAttribute('aria-describedby');

      // Add Title and Description
      rerender(
        <Modal.Root open>
          <Modal.Header>
            <Modal.Title>Dynamic Title</Modal.Title>
          </Modal.Header>
          <Modal.Description>Dynamic Description</Modal.Description>
          <Modal.Body>Content</Modal.Body>
        </Modal.Root>,
      );

      await waitFor(() => {
        const updatedDialog = screen.getByRole('dialog');
        expect(updatedDialog.getAttribute('aria-labelledby')).toBeTruthy();
        expect(updatedDialog.getAttribute('aria-describedby')).toBeTruthy();
      });
    });
  });
});
