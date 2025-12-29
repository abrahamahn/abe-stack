import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ScrollArea } from '../ScrollArea';


describe('ScrollArea', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children correctly', () => {
    render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ScrollArea className="custom-class">
        <div>Content</div>
      </ScrollArea>,
    );
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('ui-scroll-area');
  });

  it('applies scrollbarWidth prop', () => {
    const { container } = render(<ScrollArea scrollbarWidth="thick">Content</ScrollArea>);
    // Checked via style because class implementation might vary
    expect(container.firstChild).toHaveStyle({ '--scrollbar-size': '14px' });
  });

  it('applies maxHeight and maxWidth styles', () => {
    const { container } = render(
      <ScrollArea maxHeight="200px" maxWidth="300px">
        Content
      </ScrollArea>,
    );
    expect(container.firstChild).toHaveStyle({
      maxHeight: '200px',
      maxWidth: '300px',
    });
  });

  it('handles auto-hide scrollbar behavior', () => {
    const { container } = render(<ScrollArea hideDelay={1000}>Content</ScrollArea>);

    // Initial state (not scrolling, not hovered)
    // Depending on showOnHover default (true), it might be hidden if not hovered
    // The component sets opacity based on showScrollbar
    // showScrollbar = !hideDelay || isScrolling || (showOnHover && isHovered)
    // If hideDelay is set, showScrollbar is false initially if not hovered

    // Simulate scroll
    fireEvent.scroll(container.firstChild as Element);

    // Should be visible during scroll
    expect(container.firstChild).toHaveAttribute('data-scrollbar-visible', 'true');

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should be hidden after delay (if not hovered)
    expect(container.firstChild).toHaveAttribute('data-scrollbar-visible', 'false');
  });

  it('shows scrollbar on hover', () => {
    const { container } = render(<ScrollArea showOnHover={true}>Content</ScrollArea>);

    fireEvent.mouseEnter(container.firstChild as Element);
    expect(container.firstChild).toHaveAttribute('data-scrollbar-visible', 'true');

    fireEvent.mouseLeave(container.firstChild as Element);
    expect(container.firstChild).toHaveAttribute('data-scrollbar-visible', 'false');
  });
});
