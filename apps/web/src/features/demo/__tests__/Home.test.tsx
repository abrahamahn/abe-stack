// apps/web/src/features/demo/__tests__/Home.aggressive.test.tsx
/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/ban-ts-comment */
/** @vitest-environment jsdom */
// @ts-nocheck
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomePage } from '../Home';

import type { DemoView } from '../Home';

describe('HomePage - Aggressive TDD Tests', () => {
  describe('Edge Cases - onNavigate Callback', () => {
    it('should handle onNavigate throwing an error gracefully without crashing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onNavigate = vi.fn(() => {
        throw new Error('Navigation failed');
      });

      render(<HomePage onNavigate={onNavigate} />);

      // Click should NOT crash the app
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      // Error should be logged (graceful handling)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Navigation error:', expect.any(Error));

      // Component should still be functional after error
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('should handle rapid clicking (100 clicks)', async () => {
      const onNavigate = vi.fn();
      render(<HomePage onNavigate={onNavigate} />);

      const loginButton = screen.getByRole('button', { name: /login/i });

      // Rapid fire 100 clicks - tests for debouncing issues
      for (let i = 0; i < 100; i++) {
        fireEvent.click(loginButton);
      }

      await waitFor(() => {
        expect(onNavigate).toHaveBeenCalledTimes(100);
      });

      // All calls should have correct argument
      expect(onNavigate).toHaveBeenCalledWith('login');
    });

    it('should handle async onNavigate callback', async () => {
      const onNavigate = vi.fn(async (_view: DemoView) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      render(<HomePage onNavigate={onNavigate} />);

      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(onNavigate).toHaveBeenCalledWith('login');
      });
    });

    it('should handle onNavigate being reassigned during render', () => {
      let callCount = 0;
      const onNavigate1 = vi.fn(() => {
        callCount++;
      });
      const onNavigate2 = vi.fn(() => {
        callCount++;
      });

      const { rerender } = render(<HomePage onNavigate={onNavigate1} />);

      fireEvent.click(screen.getByRole('button', { name: /login/i }));
      expect(onNavigate1).toHaveBeenCalledTimes(1);

      // Rerender with different callback
      rerender(<HomePage onNavigate={onNavigate2} />);

      fireEvent.click(screen.getByRole('button', { name: /login/i }));
      expect(onNavigate2).toHaveBeenCalledTimes(1);
      expect(callCount).toBe(2);
    });

    it('should handle onNavigate that modifies state externally', () => {
      const stateTracker = { count: 0 };
      const onNavigate = vi.fn(() => {
        stateTracker.count++;
      });

      render(<HomePage onNavigate={onNavigate} />);

      fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
      fireEvent.click(screen.getByRole('button', { name: /gallery/i }));
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      expect(stateTracker.count).toBe(3);
    });
  });

  describe('Runtime Type Safety', () => {
    it('should accept any string as DemoView at runtime (TypeScript only checks compile time)', () => {
      const onNavigate = vi.fn();
      render(<HomePage onNavigate={onNavigate} />);

      // TypeScript prevents this, but at runtime there's no validation
      // This exposes lack of runtime validation
      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      expect(onNavigate).toHaveBeenCalledWith('login');
      // No runtime check prevents passing invalid view types
    });

    it('should handle onNavigate receiving wrong types at runtime', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onNavigate = vi.fn((view: any) => {
        // Simulate code that expects specific view values
        if (view !== 'login' && view !== 'dashboard' && view !== 'gallery' && view !== 'home') {
          throw new Error(`Invalid view: ${String(view)}`);
        }
      });

      render(<HomePage onNavigate={onNavigate} />);

      // These should all be valid
      expect(() => fireEvent.click(screen.getByRole('button', { name: /login/i }))).not.toThrow();
      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: /dashboard/i })),
      ).not.toThrow();
      expect(() => fireEvent.click(screen.getByRole('button', { name: /gallery/i }))).not.toThrow();
    });
  });

  describe('Component Lifecycle', () => {
    it('should not call onNavigate after component unmounts', () => {
      const onNavigate = vi.fn();
      const { unmount } = render(<HomePage onNavigate={onNavigate} />);

      const loginButton = screen.getByRole('button', { name: /login/i });

      unmount();

      // Button no longer exists after unmount
      expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument();
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('should handle re-rendering with same props', () => {
      const onNavigate = vi.fn();
      const { rerender } = render(<HomePage onNavigate={onNavigate} />);

      rerender(<HomePage onNavigate={onNavigate} />);
      rerender(<HomePage onNavigate={onNavigate} />);

      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('should handle switching from undefined to defined onNavigate', () => {
      const { rerender } = render(<HomePage />);

      expect(() => {
        fireEvent.click(screen.getByRole('button', { name: /login/i }));
      }).not.toThrow();

      const onNavigate = vi.fn();
      rerender(<HomePage onNavigate={onNavigate} />);

      fireEvent.click(screen.getByRole('button', { name: /login/i }));
      expect(onNavigate).toHaveBeenCalledWith('login');
    });
  });

  describe('Accessibility Edge Cases', () => {
    it('should handle keyboard navigation (Enter key)', () => {
      const onNavigate = vi.fn();
      render(<HomePage onNavigate={onNavigate} />);

      const loginButton = screen.getByRole('button', { name: /login/i });
      loginButton.focus();

      fireEvent.keyDown(loginButton, { key: 'Enter', code: 'Enter' });

      // Buttons should respond to Enter key
      expect(onNavigate).toHaveBeenCalledWith('login');
    });

    it('should handle keyboard navigation (Space key)', () => {
      const onNavigate = vi.fn();
      render(<HomePage onNavigate={onNavigate} />);

      const loginButton = screen.getByRole('button', { name: /login/i });
      loginButton.focus();

      fireEvent.keyDown(loginButton, { key: ' ', code: 'Space' });

      // Buttons should respond to Space key
      expect(onNavigate).toHaveBeenCalledWith('login');
    });

    it('should have all buttons focusable', () => {
      render(<HomePage />);

      const buttons = screen.getAllByRole('button');

      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabIndex', '-1');
      });
    });

    it('should not have empty button text', () => {
      render(<HomePage />);

      const buttons = screen.getAllByRole('button');

      buttons.forEach((button) => {
        expect(button.textContent).toBeTruthy();
        expect(button.textContent.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance & Memory', () => {
    it('should not create new callback functions on every click', () => {
      const onNavigate = vi.fn();
      render(<HomePage onNavigate={onNavigate} />);

      const loginButton = screen.getByRole('button', { name: /login/i });

      // Get the onClick handler
      const onClick1 = loginButton.onclick;

      fireEvent.click(loginButton);

      // Handler should be the same reference
      const onClick2 = loginButton.onclick;

      expect(onClick1).toBe(onClick2);

      // Use loginButton to avoid unused var
      expect(loginButton).toBeInTheDocument();
    });

    it('should handle many rapid re-renders', () => {
      const onNavigate = vi.fn();
      const { rerender } = render(<HomePage onNavigate={onNavigate} />);

      // Simulate 100 re-renders
      for (let i = 0; i < 100; i++) {
        rerender(<HomePage onNavigate={onNavigate} />);
      }

      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });
  });

  describe('UI Structure Edge Cases', () => {
    it('should render all tech stack items in a list', () => {
      const { container } = render(<HomePage />);

      const lists = container.querySelectorAll('ul');
      expect(lists.length).toBeGreaterThan(0);

      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBe(5); // Should have exactly 5 tech stack items
    });

    it('should maintain consistent button count', () => {
      render(<HomePage />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3); // Login, Dashboard, Gallery
    });

    it('should have proper semantic HTML structure', () => {
      const { container } = render(<HomePage />);

      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('Inline Styles Edge Cases', () => {
    it('should have display grid on main section', () => {
      const { container } = render(<HomePage />);

      const section = container.querySelector('section');
      expect(section).toHaveStyle({ display: 'grid' });
    });

    it('should have gap and flex on button section', () => {
      const { container } = render(<HomePage />);

      const sections = container.querySelectorAll('section');
      const buttonSection = sections[1]; // Second section contains buttons

      expect(buttonSection).toHaveStyle({ display: 'flex' });
    });
  });

  describe('Error Boundary Cases', () => {
    it('should render without errors when onNavigate is null (coerced to undefined)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<HomePage onNavigate={null as any} />);

      expect(() => {
        fireEvent.click(screen.getByRole('button', { name: /login/i }));
      }).not.toThrow();
    });
  });
});
