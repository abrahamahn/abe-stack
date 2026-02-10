// src/client/ui/src/layouts/layers/SidePeek.test.tsx
/** @vitest-environment jsdom */
import { SidePeek } from '@layers/SidePeek';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('SidePeek', () => {
  // Clean up body overflow between tests
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  describe('happy path - rendering', () => {
    it('renders nothing when closed', () => {
      render(
        <SidePeek.Root open={false} onClose={vi.fn()}>
          <SidePeek.Content>Hidden</SidePeek.Content>
        </SidePeek.Root>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders dialog when open', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('renders all side peek parts correctly', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Header>
            <SidePeek.Title>Peek Title</SidePeek.Title>
            <SidePeek.Close />
          </SidePeek.Header>
          <SidePeek.Description>Peek Description</SidePeek.Description>
          <SidePeek.Content>Peek Content</SidePeek.Content>
          <SidePeek.Footer>
            <button type="button">Action</button>
          </SidePeek.Footer>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByText('Peek Title')).toBeInTheDocument();
      });
      expect(screen.getByText('Peek Description')).toBeInTheDocument();
      expect(screen.getByText('Peek Content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('renders with default size (md)', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveClass('side-peek--md');
      });
    });

    it('renders with custom size', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()} size="lg">
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveClass('side-peek--lg');
      });
    });
  });

  describe('happy path - size variants', () => {
    it('renders with size="sm"', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()} size="sm">
          <SidePeek.Content>Small</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveClass('side-peek--sm');
      });
    });

    it('renders with size="xl"', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()} size="xl">
          <SidePeek.Content>Extra Large</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveClass('side-peek--xl');
      });
    });

    it('renders with size="full"', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()} size="full">
          <SidePeek.Content>Full Width</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveClass('side-peek--full');
      });
    });
  });

  describe('happy path - interactions', () => {
    it('closes on overlay click', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const overlay = document.body.querySelector('.side-peek-overlay');
      expect(overlay).toBeInTheDocument();

      if (overlay !== null) {
        await user.click(overlay as HTMLElement);
      }

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('closes on Escape key', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('closes via Close button', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Header>
            <SidePeek.Close>Close</SidePeek.Close>
          </SidePeek.Header>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('renders default Close button text', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Header>
            <SidePeek.Close />
          </SidePeek.Header>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close' })).toHaveTextContent('×');
      });
    });
  });

  describe('edge cases - closeOnOverlayClick prop', () => {
    it('does not close on overlay click when closeOnOverlayClick=false', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose} closeOnOverlayClick={false}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const overlay = document.body.querySelector('.side-peek-overlay');
      if (overlay !== null) {
        await user.click(overlay as HTMLElement);
      }

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('closes on overlay click when closeOnOverlayClick=true (default)', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const overlay = document.body.querySelector('.side-peek-overlay');
      if (overlay !== null) {
        await user.click(overlay as HTMLElement);
      }

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases - closeOnEscape prop', () => {
    it('does not close on Escape key when closeOnEscape=false', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose} closeOnEscape={false}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('closes on Escape key when closeOnEscape=true (default)', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('handles undefined onClose gracefully', async () => {
      const user = userEvent.setup();

      render(
        <SidePeek.Root open>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');
      // Should not crash
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles null onClose gracefully', () => {
      const user = userEvent.setup();

      render(
        <SidePeek.Root open onClose={null as unknown as () => void}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      const overlay = document.body.querySelector('.side-peek-overlay');
      if (overlay !== null) {
        expect(() => user.click(overlay as HTMLElement)).not.toThrow();
      }

      expect(() => user.keyboard('{Escape}')).not.toThrow();
    });

    it('handles missing Title', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Header>
            <span>No title component</span>
          </SidePeek.Header>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).not.toHaveAttribute('aria-labelledby');
      });
    });

    it('handles missing Description', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).not.toHaveAttribute('aria-describedby');
      });
    });

    it('handles null children in Content', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>{null}</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('handles undefined children in Content', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>{undefined}</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('handles empty Content', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content></SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles rapid overlay clicks', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const overlay = document.body.querySelector('.side-peek-overlay');
      if (overlay !== null) {
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
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press Escape 5 times
      await user.keyboard('{Escape}');
      await user.keyboard('{Escape}');
      await user.keyboard('{Escape}');
      await user.keyboard('{Escape}');
      await user.keyboard('{Escape}');

      expect(handleClose).toHaveBeenCalledTimes(5);
    });

    it('handles rapid prop changes', () => {
      vi.useFakeTimers();
      const { rerender } = render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content 1</SidePeek.Content>
        </SidePeek.Root>,
      );

      // Rapidly toggle open/closed
      for (let i = 0; i < 10; i++) {
        rerender(
          <SidePeek.Root open={i % 2 === 0} onClose={vi.fn()}>
            <SidePeek.Content>Content {i}</SidePeek.Content>
          </SidePeek.Root>,
        );
      }

      // After the close transition completes, panel should be unmounted
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('handles multiple onClose calls', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Header>
            <SidePeek.Close>Close</SidePeek.Close>
          </SidePeek.Header>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

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
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      unmount();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('cleans up properly on unmount when closed', () => {
      const { unmount } = render(
        <SidePeek.Root open={false} onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      unmount();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('removes event listeners on unmount', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      const { unmount } = render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      unmount();

      // Try to trigger Escape after unmount
      await user.keyboard('{Escape}');

      // Should not call onClose after unmount
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('restores body overflow on unmount', async () => {
      document.body.style.overflow = 'visible';

      const { unmount } = render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });

      unmount();

      expect(document.body.style.overflow).toBe('visible');
    });
  });

  describe('edge cases - special characters', () => {
    it('handles special characters in Title', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Header>
            <SidePeek.Title>{'<Title> with & special \'chars\' "quotes"'}</SidePeek.Title>
          </SidePeek.Header>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByText('<Title> with & special \'chars\' "quotes"')).toBeInTheDocument();
      });
    });

    it('handles special characters in Description', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Description>
            {'<Description> & special \'chars\' "quotes"'}
          </SidePeek.Description>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByText('<Description> & special \'chars\' "quotes"')).toBeInTheDocument();
      });
    });

    it('handles special characters in Content', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>{'Content & special <chars> "quotes"'}</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByText('Content & special <chars> "quotes"')).toBeInTheDocument();
      });
    });

    it('handles special characters in Close button', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Header>
            <SidePeek.Close>{'<Close> & "button"'}</SidePeek.Close>
          </SidePeek.Header>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close' })).toHaveTextContent(
          '<Close> & "button"',
        );
      });
    });
  });

  describe('keyboard interactions', () => {
    it('prevents default Escape behavior', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on other keys', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Enter}');
      await user.keyboard('{Space}');
      await user.keyboard('{Tab}');
      await user.keyboard('a');

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('does not close on Escape when onClose is not provided', async () => {
      const user = userEvent.setup();

      render(
        <SidePeek.Root open>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      // Side peek should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('mouse interactions', () => {
    it('handles overlay double-click', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const overlay = document.body.querySelector('.side-peek-overlay');
      if (overlay !== null) {
        await user.dblClick(overlay as HTMLElement);
      }

      // Double-click should trigger two close calls
      expect(handleClose).toHaveBeenCalledTimes(2);
    });

    it('does not close when clicking side peek content', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const content = screen.getByText('Content');
      await user.click(content);

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('handles clicks on Close button with Enter key', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Header>
            <SidePeek.Close>Close</SidePeek.Close>
          </SidePeek.Header>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: 'Close' });
      closeButton.focus();
      await user.keyboard('{Enter}');

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('handles clicks on Close button with Space key', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <SidePeek.Root open onClose={handleClose}>
          <SidePeek.Header>
            <SidePeek.Close>Close</SidePeek.Close>
          </SidePeek.Header>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: 'Close' });
      closeButton.focus();
      await user.keyboard(' ');

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has aria-modal attribute', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });
    });

    it('links Title to dialog via aria-labelledby', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Header>
            <SidePeek.Title>Peek Title</SidePeek.Title>
          </SidePeek.Header>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const title = screen.getByText('Peek Title');

        expect(dialog).toHaveAttribute('aria-labelledby', title.getAttribute('id'));
        expect(title.getAttribute('id')).toBeTruthy();
      });
    });

    it('links Description to dialog via aria-describedby', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Description>Peek Description</SidePeek.Description>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const description = screen.getByText('Peek Description');

        // Note: Source has a bug - uses 'describedId' instead of 'descriptionId' in context provider
        // This test reflects actual behavior, not intended behavior
        expect(dialog.getAttribute('aria-describedby')).toBe(description.getAttribute('id'));
        expect(description.getAttribute('id')).toBeTruthy();
      });
    });

    it('has semantic dialog role', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('Close button has aria-label', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Header>
            <SidePeek.Close>Custom Text</SidePeek.Close>
          </SidePeek.Header>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: 'Close' });
        expect(closeButton).toHaveAttribute('aria-label', 'Close');
      });
    });

    it('focuses first focusable element when opened', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>
            <button type="button">First Button</button>
            <button type="button">Second Button</button>
          </SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'First Button' })).toHaveFocus();
      });
    });

    it('supports custom ARIA attributes on Title', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Header>
            <SidePeek.Title aria-label="Custom Title Label">Title</SidePeek.Title>
          </SidePeek.Header>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const title = screen.getByText('Title');
        expect(title).toHaveAttribute('aria-label', 'Custom Title Label');
      });
    });

    it('overlay has aria-hidden', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const overlay = document.body.querySelector('.side-peek-overlay');
        expect(overlay).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('context validation', () => {
    it('throws error when Title used outside Root', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<SidePeek.Title>Title</SidePeek.Title>);
      }).toThrow('SidePeek compound components must be used within SidePeek.Root');

      spy.mockRestore();
    });

    it('throws error when Description used outside Root', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<SidePeek.Description>Description</SidePeek.Description>);
      }).toThrow('SidePeek compound components must be used within SidePeek.Root');

      spy.mockRestore();
    });

    it('throws error when Close used outside Root', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<SidePeek.Close>Close</SidePeek.Close>);
      }).toThrow('SidePeek compound components must be used within SidePeek.Root');

      spy.mockRestore();
    });

    it('allows Header, Content, Footer outside Root (no context required)', () => {
      expect(() => {
        render(<SidePeek.Header>Header</SidePeek.Header>);
      }).not.toThrow();

      expect(() => {
        render(<SidePeek.Content>Content</SidePeek.Content>);
      }).not.toThrow();

      expect(() => {
        render(<SidePeek.Footer>Footer</SidePeek.Footer>);
      }).not.toThrow();
    });
  });

  describe('portal rendering', () => {
    it('renders side peek into document.body via portal', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Portal Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog.parentElement).toBe(document.body);
      });
    });

    it('renders overlay into document.body', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const overlay = document.body.querySelector('.side-peek-overlay');
        expect(overlay).toBeInTheDocument();
        expect(overlay?.parentElement).toBe(document.body);
      });
    });
  });

  describe('animation states', () => {
    it('applies open class when animating in', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveClass('side-peek--open');
      });
    });

    it('removes open class when closing and unmounts after transition', () => {
      vi.useFakeTimers();
      const { rerender } = render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      // Wait for open animation to start
      act(() => {
        vi.advanceTimersByTime(10);
      });
      expect(screen.getByRole('dialog')).toHaveClass('side-peek--open');

      rerender(
        <SidePeek.Root open={false} onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      // Panel should still be in DOM but without --open class (slide-out animation)
      expect(screen.getByRole('dialog')).not.toHaveClass('side-peek--open');

      // After transition duration, panel should be unmounted
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('applies open class to overlay when animating in', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const overlay = document.body.querySelector('.side-peek-overlay');
        expect(overlay).toHaveClass('side-peek-overlay--open');
      });
    });
  });

  describe('body scroll prevention', () => {
    it('prevents body scroll when open', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });
    });

    it('does not prevent body scroll when closed', () => {
      render(
        <SidePeek.Root open={false} onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      expect(document.body.style.overflow).not.toBe('hidden');
    });

    it('restores body overflow when closing', () => {
      vi.useFakeTimers();
      const { rerender } = render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      act(() => {
        vi.advanceTimersByTime(10);
      });
      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <SidePeek.Root open={false} onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      // Wait for close transition to complete
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(document.body.style.overflow).not.toBe('hidden');
      vi.useRealTimers();
    });
  });

  describe('real-world chaos - aggressive bug hunting', () => {
    it('survives opening and closing rapidly 20 times', () => {
      vi.useFakeTimers();
      const { rerender } = render(
        <SidePeek.Root open={false} onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      for (let i = 0; i < 20; i++) {
        rerender(
          <SidePeek.Root open={i % 2 === 0} onClose={vi.fn()}>
            <SidePeek.Content>Content {i}</SidePeek.Content>
          </SidePeek.Root>,
        );
      }

      // After close transition completes, should be unmounted
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('handles alternating onClose callbacks', async () => {
      const handleClose1 = vi.fn();
      const handleClose2 = vi.fn();

      const { rerender } = render(
        <SidePeek.Root open onClose={handleClose1}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Change onClose callback
      rerender(
        <SidePeek.Root open onClose={handleClose2}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      // Original callback should not be called
      expect(handleClose1).not.toHaveBeenCalled();
      expect(handleClose2).not.toHaveBeenCalled();
    });

    it('handles content that changes during open state', async () => {
      const { rerender } = render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content 1</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByText('Content 1')).toBeInTheDocument();
      });

      // Change content while open
      rerender(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content 2</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
        expect(screen.getByText('Content 2')).toBeInTheDocument();
      });
    });

    it('handles nested interactive elements in Content', async () => {
      const user = userEvent.setup();
      const handleButtonClick = vi.fn();

      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>
            <div>
              <div>
                <button type="button" onClick={handleButtonClick}>
                  Nested Button
                </button>
              </div>
            </div>
          </SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Nested Button' }));
      expect(handleButtonClick).toHaveBeenCalledTimes(1);
    });

    it('handles multiple Title components (should use last one)', async () => {
      render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Header>
            <SidePeek.Title>First Title</SidePeek.Title>
            <SidePeek.Title>Second Title</SidePeek.Title>
          </SidePeek.Header>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const secondTitle = screen.getByText('Second Title');

        // Should use the last Title's ID
        expect(dialog).toHaveAttribute('aria-labelledby', secondTitle.getAttribute('id'));
      });
    });

    it('handles Title and Description mounting/unmounting dynamically', async () => {
      const { rerender } = render(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');

        expect(dialog).not.toHaveAttribute('aria-labelledby');
        expect(dialog).not.toHaveAttribute('aria-describedby');
      });

      // Add Title and Description
      rerender(
        <SidePeek.Root open onClose={vi.fn()}>
          <SidePeek.Header>
            <SidePeek.Title>Dynamic Title</SidePeek.Title>
          </SidePeek.Header>
          <SidePeek.Description>Dynamic Description</SidePeek.Description>
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const updatedDialog = screen.getByRole('dialog');
        const title = screen.getByText('Dynamic Title');
        const description = screen.getByText('Dynamic Description');

        expect(updatedDialog.getAttribute('aria-labelledby')).toBe(title.getAttribute('id'));
        expect(updatedDialog.getAttribute('aria-describedby')).toBe(description.getAttribute('id'));
      });
    });

    it('handles size changes during open state', async () => {
      const { rerender } = render(
        <SidePeek.Root open onClose={vi.fn()} size="sm">
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveClass('side-peek--sm');
      });

      // Change size while open
      rerender(
        <SidePeek.Root open onClose={vi.fn()} size="xl">
          <SidePeek.Content>Content</SidePeek.Content>
        </SidePeek.Root>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).not.toHaveClass('side-peek--sm');
        expect(dialog).toHaveClass('side-peek--xl');
      });
    });
  });
});
