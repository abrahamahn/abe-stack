// packages/ui/src/elements/__tests__/Overlay.test.tsx
/** @vitest-environment jsdom */
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Overlay } from '../Overlay';

describe('Overlay', () => {
  describe('happy path', () => {
    it('renders nothing when closed', () => {
      render(<Overlay open={false} />);

      expect(document.body.querySelector('.ui-overlay')).toBeNull();
    });

    it('renders overlay when open', async () => {
      render(<Overlay open />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
      });
    });

    it('handles click with userEvent', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<Overlay open onClick={onClick} />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toBeInTheDocument();
      });

      const overlay = document.body.querySelector('.ui-overlay');
      if (overlay) {
        await user.click(overlay as HTMLElement);
      }

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('toggles visibility when open prop changes', async () => {
      const { rerender } = render(<Overlay open={false} />);

      expect(document.body.querySelector('.ui-overlay')).toBeNull();

      rerender(<Overlay open />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
      });

      rerender(<Overlay open={false} />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeNull();
      });
    });

    it('forwards className to overlay', async () => {
      render(<Overlay open className="custom-overlay" />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toHaveClass('ui-overlay');
        expect(overlay).toHaveClass('custom-overlay');
      });
    });

    it('forwards style to overlay', async () => {
      render(<Overlay open style={{ zIndex: 9999 }} />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toHaveStyle({ zIndex: '9999' });
      });
    });

    it('forwards ref to overlay element', async () => {
      const ref = { current: null };
      render(<Overlay ref={ref} open />);

      await waitFor(() => {
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
        expect(ref.current).toHaveClass('ui-overlay');
      });
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('handles null onClick gracefully', async () => {
      const user = userEvent.setup();

      render(
        // @ts-expect-error Testing invalid prop
        <Overlay open onClick={null} />,
      );

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toBeInTheDocument();
      });

      const overlay = document.body.querySelector('.ui-overlay');
      if (overlay) {
        expect(() => user.click(overlay as HTMLElement)).not.toThrow();
      }
    });

    it('handles undefined onClick gracefully', async () => {
      const user = userEvent.setup();

      render(<Overlay open onClick={undefined} />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toBeInTheDocument();
      });

      const overlay = document.body.querySelector('.ui-overlay');
      if (overlay) {
        await user.click(overlay as HTMLElement);
        // Should not crash
      }

      expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
    });

    it('handles missing className', async () => {
      render(<Overlay open />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toHaveClass('ui-overlay');
        expect(overlay?.className).toBe('ui-overlay');
      });
    });

    it('handles empty className', async () => {
      render(<Overlay open className="" />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toHaveClass('ui-overlay');
        expect(overlay?.className).toBe('ui-overlay');
      });
    });

    it('handles missing style', async () => {
      render(<Overlay open />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toBeInTheDocument();
      });
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles rapid clicks', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<Overlay open onClick={onClick} />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
      });

      const overlay = document.body.querySelector('.ui-overlay');
      if (overlay) {
        const element = overlay as HTMLElement;
        // Click 10 times rapidly
        for (let i = 0; i < 10; i++) {
          await user.click(element);
        }
      }

      expect(onClick).toHaveBeenCalledTimes(10);
    });

    it('handles rapid prop changes', async () => {
      const { rerender } = render(<Overlay open />);

      // Rapidly toggle open/closed 20 times
      for (let i = 0; i < 20; i++) {
        rerender(<Overlay open={i % 2 === 0} />);
      }

      // Should be closed after 20 iterations (even number)
      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeNull();
      });
    });

    it('handles rapid onClick callback changes', async () => {
      const onClick1 = vi.fn();
      const onClick2 = vi.fn();
      const onClick3 = vi.fn();

      const { rerender } = render(<Overlay open onClick={onClick1} />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
      });

      // Change callback rapidly
      rerender(<Overlay open onClick={onClick2} />);
      rerender(<Overlay open onClick={onClick3} />);

      // None should be called yet
      expect(onClick1).not.toHaveBeenCalled();
      expect(onClick2).not.toHaveBeenCalled();
      expect(onClick3).not.toHaveBeenCalled();
    });

    it('handles multiple overlays at once', async () => {
      render(
        <>
          <Overlay open className="overlay-1" />
          <Overlay open className="overlay-2" />
          <Overlay open className="overlay-3" />
        </>,
      );

      await waitFor(() => {
        expect(document.body.querySelector('.overlay-1')).toBeInTheDocument();
        expect(document.body.querySelector('.overlay-2')).toBeInTheDocument();
        expect(document.body.querySelector('.overlay-3')).toBeInTheDocument();
      });
    });
  });

  describe('edge cases - cleanup', () => {
    it('cleans up properly on unmount when open', async () => {
      const { unmount } = render(<Overlay open />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
      });

      unmount();

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeNull();
      });
    });

    it('cleans up properly on unmount when closed', () => {
      const { unmount } = render(<Overlay open={false} />);

      expect(document.body.querySelector('.ui-overlay')).toBeNull();

      unmount();

      expect(document.body.querySelector('.ui-overlay')).toBeNull();
    });

    it('removes overlay from DOM when toggled closed', async () => {
      const { rerender } = render(<Overlay open />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
      });

      rerender(<Overlay open={false} />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeNull();
      });
    });
  });

  describe('edge cases - special characters', () => {
    it('handles special characters in className', async () => {
      render(<Overlay open className="overlay__with--special___chars" />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.overlay__with--special___chars');
        expect(overlay).toBeInTheDocument();
      });
    });

    it('handles className with spaces', async () => {
      render(<Overlay open className="class1 class2 class3" />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toHaveClass('ui-overlay');
        expect(overlay).toHaveClass('class1');
        expect(overlay).toHaveClass('class2');
        expect(overlay).toHaveClass('class3');
      });
    });
  });

  describe('mouse interactions', () => {
    it('handles double-click', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<Overlay open onClick={onClick} />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
      });

      const overlay = document.body.querySelector('.ui-overlay');
      if (overlay) {
        await user.dblClick(overlay as HTMLElement);
      }

      // Double-click should trigger two click events
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('handles click without onClick handler', async () => {
      const user = userEvent.setup();

      render(<Overlay open />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
      });

      const overlay = document.body.querySelector('.ui-overlay');
      if (overlay) {
        expect(() => user.click(overlay as HTMLElement)).not.toThrow();
      }
    });

    it('handles multiple clicks with different callbacks', async () => {
      const user = userEvent.setup();
      const onClick1 = vi.fn();
      const onClick2 = vi.fn();

      const { rerender } = render(<Overlay open onClick={onClick1} />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
      });

      let overlay = document.body.querySelector('.ui-overlay');
      if (overlay) {
        await user.click(overlay as HTMLElement);
      }

      expect(onClick1).toHaveBeenCalledTimes(1);
      expect(onClick2).not.toHaveBeenCalled();

      // Change callback
      rerender(<Overlay open onClick={onClick2} />);

      overlay = document.body.querySelector('.ui-overlay');
      if (overlay) {
        await user.click(overlay as HTMLElement);
      }

      expect(onClick1).toHaveBeenCalledTimes(1); // Still 1
      expect(onClick2).toHaveBeenCalledTimes(1); // Now 1
    });
  });

  describe('portal rendering', () => {
    it('renders overlay into document.body via portal', async () => {
      render(<Overlay open />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toBeInTheDocument();
        expect(overlay?.parentElement).toBe(document.body);
      });
    });

    it('does not render in the component tree', async () => {
      const { container } = render(<Overlay open />);

      // Container should be empty (overlay is portaled to body)
      expect(container.querySelector('.ui-overlay')).toBeNull();

      await waitFor(() => {
        // But it should exist in document.body
        expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
      });
    });
  });

  describe('prop forwarding', () => {
    it('forwards data attributes', async () => {
      render(<Overlay open data-testid="custom-overlay" data-foo="bar" />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toHaveAttribute('data-testid', 'custom-overlay');
        expect(overlay).toHaveAttribute('data-foo', 'bar');
      });
    });

    it('forwards aria attributes', async () => {
      render(<Overlay open aria-label="Overlay" aria-hidden="false" />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toHaveAttribute('aria-label', 'Overlay');
        expect(overlay).toHaveAttribute('aria-hidden', 'false');
      });
    });

    it('forwards custom props', async () => {
      render(<Overlay open role="presentation" />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toHaveAttribute('role', 'presentation');
      });
    });
  });

  describe('real-world chaos - aggressive bug hunting', () => {
    it('survives opening and closing rapidly 50 times', async () => {
      const { rerender } = render(<Overlay open={false} />);

      for (let i = 0; i < 50; i++) {
        rerender(<Overlay open={i % 2 === 0} />);
      }

      // Should be closed after 50 iterations
      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeNull();
      });
    });

    it('handles className changes during open state', async () => {
      const { rerender } = render(<Overlay open className="class1" />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toHaveClass('class1');
      });

      // Change className while open
      rerender(<Overlay open className="class2" />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).not.toHaveClass('class1');
        expect(overlay).toHaveClass('class2');
      });
    });

    it('handles style changes during open state', async () => {
      const { rerender } = render(<Overlay open style={{ zIndex: 100 }} />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toHaveStyle({ zIndex: '100' });
      });

      // Change style while open
      rerender(<Overlay open style={{ zIndex: 200 }} />);

      await waitFor(() => {
        const overlay = document.body.querySelector('.ui-overlay');
        expect(overlay).toHaveStyle({ zIndex: '200' });
      });
    });

    it('handles alternating between multiple onClick handlers', async () => {
      const user = userEvent.setup();
      const handlers = [vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn()];

      const { rerender } = render(<Overlay open onClick={handlers[0]} />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
      });

      // Cycle through handlers
      for (let i = 0; i < handlers.length; i++) {
        rerender(<Overlay open onClick={handlers[i]} />);

        const overlay = document.body.querySelector('.ui-overlay');
        if (overlay) {
          await user.click(overlay as HTMLElement);
        }

        // Only current handler should be called
        expect(handlers[i]).toHaveBeenCalledTimes(1);

        // Previous handlers should not have additional calls
        for (let j = 0; j < i; j++) {
          expect(handlers[j]).toHaveBeenCalledTimes(1);
        }
      }
    });

    it('handles rapid mounting and unmounting', async () => {
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(<Overlay open />);

        await waitFor(() => {
          expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
        });

        unmount();

        await waitFor(() => {
          expect(document.body.querySelector('.ui-overlay')).toBeNull();
        });
      }

      // Final check - no overlays should remain
      expect(document.body.querySelector('.ui-overlay')).toBeNull();
    });

    it('handles clicks during prop transitions', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      const { rerender } = render(<Overlay open={false} onClick={onClick} />);

      // Open it
      rerender(<Overlay open onClick={onClick} />);

      await waitFor(() => {
        expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
      });

      const overlay = document.body.querySelector('.ui-overlay');
      if (overlay) {
        await user.click(overlay as HTMLElement);
      }

      expect(onClick).toHaveBeenCalledTimes(1);

      // Close and reopen quickly
      rerender(<Overlay open={false} onClick={onClick} />);
      rerender(<Overlay open onClick={onClick} />);

      await waitFor(() => {
        const newOverlay = document.body.querySelector('.ui-overlay');
        if (newOverlay) {
          user.click(newOverlay as HTMLElement);
        }
      });

      // Should have been called twice total
      await waitFor(() => {
        expect(onClick).toHaveBeenCalledTimes(2);
      });
    });
  });
});
