// shared/ui/src/elements/SkipLink.test.tsx
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('renders with default label and href', () => {
    render(<SkipLink />);

    const link = screen.getByText('Skip to main content');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#main-content');
    expect(link).toHaveClass('skip-link');
  });

  it('renders with custom label and target', () => {
    render(<SkipLink targetId="content" label="Skip navigation" />);

    const link = screen.getByText('Skip navigation');
    expect(link).toHaveAttribute('href', '#content');
  });

  it('focuses the target element on click', () => {
    const target = document.createElement('main');
    target.id = 'main-content';
    document.body.appendChild(target);

    const focusSpy = vi.spyOn(target, 'focus');

    render(<SkipLink />);

    fireEvent.click(screen.getByText('Skip to main content'));

    expect(focusSpy).toHaveBeenCalled();
  });

  it('sets and removes tabindex on the target element', () => {
    const target = document.createElement('main');
    target.id = 'main-content';
    document.body.appendChild(target);

    render(<SkipLink />);

    fireEvent.click(screen.getByText('Skip to main content'));

    // tabindex should be removed after focus
    expect(target.hasAttribute('tabindex')).toBe(false);
  });

  it('prevents default anchor navigation', () => {
    render(<SkipLink />);

    const link = screen.getByText('Skip to main content');
    const preventDefaultSpy = vi.fn();

    fireEvent.click(link, {
      preventDefault: preventDefaultSpy,
    });

    // The click handler calls e.preventDefault()
    // We verify the target wasn't scrolled to via hash
    expect(window.location.hash).not.toBe('#main-content');
  });

  it('handles missing target element gracefully', () => {
    render(<SkipLink targetId="nonexistent" />);

    // Should not throw when target doesn't exist
    expect(() => {
      fireEvent.click(screen.getByText('Skip to main content'));
    }).not.toThrow();
  });

  it('applies additional className', () => {
    render(<SkipLink className="custom-class" />);

    const link = screen.getByText('Skip to main content');
    expect(link).toHaveClass('skip-link');
    expect(link).toHaveClass('custom-class');
  });
});
