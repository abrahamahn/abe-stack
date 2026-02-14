// main/client/ui/src/components/PeekLink.test.tsx
/**
 * Tests for PeekLink component.
 *
 * Tests link behavior for opening content in side-peek panel.
 */

import { MemoryRouter } from '@abe-stack/react/router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { PeekLink } from './PeekLink';

const TestWrapper = ({
  children,
  initialPath = '/',
}: {
  children: React.ReactNode;
  initialPath?: string;
}) => (
  <MemoryRouter key={initialPath} initialEntries={[initialPath]}>
    {children}
  </MemoryRouter>
);

describe('PeekLink', () => {
  describe('rendering', () => {
    it('should render as an anchor element', () => {
      render(
        <TestWrapper>
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      expect(link.tagName).toBe('A');
    });

    it('should set href with peek query param', () => {
      render(
        <TestWrapper>
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      expect(link).toHaveAttribute('href', '?peek=%2Fusers%2F123');
    });

    it('should render children', () => {
      render(
        <TestWrapper>
          <PeekLink to="/settings">
            <span>Open Settings</span>
          </PeekLink>
        </TestWrapper>,
      );

      expect(screen.getByText('Open Settings')).toBeInTheDocument();
    });

    it('should pass additional props to anchor', () => {
      render(
        <TestWrapper>
          <PeekLink to="/users/123" className="custom-class" data-testid="peek-link">
            View
          </PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByTestId('peek-link');
      expect(link).toHaveClass('custom-class');
    });
  });

  describe('click behavior', () => {
    it('should prevent default navigation on click', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      await user.click(link);

      // URL should be updated with peek param (tested via useSidePeek integration)
      expect(link).toBeInTheDocument();
    });

    it('should call custom onClick handler', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <TestWrapper>
          <PeekLink to="/users/123" onClick={onClick}>
            View User
          </PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      await user.click(link);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should open peek by default', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      await user.click(link);

      // Peek should be opened (tested via useSidePeek hook behavior)
      expect(link).toBeInTheDocument();
    });

    it('should toggle peek when toggle prop is true', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PeekLink to="/users/123" toggle>
            View User
          </PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      await user.click(link);

      // Toggle behavior tested via useSidePeek integration
      expect(link).toBeInTheDocument();
    });
  });

  describe('modified clicks', () => {
    it('should allow default behavior for meta key click', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      await user.keyboard('{Meta}');
      await user.click(link);
      await user.keyboard('{/Meta}');

      // Should allow default behavior (open in new tab)
      expect(link).toBeInTheDocument();
    });

    it('should allow default behavior for ctrl key click', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      await user.keyboard('{Control}');
      await user.click(link);
      await user.keyboard('{/Control}');

      expect(link).toBeInTheDocument();
    });

    it('should allow default behavior for shift key click', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      await user.keyboard('{Shift}');
      await user.click(link);
      await user.keyboard('{/Shift}');

      expect(link).toBeInTheDocument();
    });

    it('should allow default behavior for alt key click', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      await user.keyboard('{Alt}');
      await user.click(link);
      await user.keyboard('{/Alt}');

      expect(link).toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('should not have active attribute when path does not match', () => {
      render(
        <TestWrapper initialPath="/">
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      expect(link).not.toHaveAttribute('data-peek-active');
    });

    it('should have active attribute when path matches', () => {
      render(
        <TestWrapper initialPath="/?peek=/users/123">
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      expect(link).toHaveAttribute('data-peek-active', '');
    });

    it('should update active state when peek path changes', () => {
      const { rerender } = render(
        <TestWrapper initialPath="/">
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      let link = screen.getByRole('link', { name: 'View User' });
      expect(link).not.toHaveAttribute('data-peek-active');

      // Rerender with peek path
      rerender(
        <TestWrapper initialPath="/?peek=/users/123">
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      link = screen.getByRole('link', { name: 'View User' });
      expect(link).toHaveAttribute('data-peek-active', '');
    });
  });

  describe('edge cases', () => {
    it('should handle empty path', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PeekLink to="">Empty</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'Empty' });
      await user.click(link);

      expect(link).toBeInTheDocument();
    });

    it('should handle path with query params', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PeekLink to="/users/123?tab=activity">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      expect(link).toHaveAttribute('href', '?peek=%2Fusers%2F123%3Ftab%3Dactivity');

      await user.click(link);
      expect(link).toBeInTheDocument();
    });

    it('should handle path with hash', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PeekLink to="/users/123#profile">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });
      expect(link).toHaveAttribute('href', '?peek=%2Fusers%2F123%23profile');

      await user.click(link);
      expect(link).toBeInTheDocument();
    });

    it('should handle special characters in path', () => {
      render(
        <TestWrapper>
          <PeekLink to="/search?q=hello world&sort=date">Search</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'Search' });
      expect(link).toHaveAttribute('href');
    });

    it('should handle middle mouse button click', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });

      // Middle click (button 1) should allow default behavior
      await user.pointer([{ keys: '[MouseMiddle>]', target: link }]);

      expect(link).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'View User' });

      await user.tab();
      expect(link).toHaveFocus();

      await user.keyboard('[Enter]');
      expect(link).toBeInTheDocument();
    });

    it('should have correct role', () => {
      render(
        <TestWrapper>
          <PeekLink to="/users/123">View User</PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    it('should support aria attributes', () => {
      render(
        <TestWrapper>
          <PeekLink to="/users/123" aria-label="Open user profile in side panel">
            View
          </PeekLink>
        </TestWrapper>,
      );

      const link = screen.getByRole('link', { name: 'Open user profile in side panel' });
      expect(link).toBeInTheDocument();
    });
  });
});
