// packages/ui/src/layouts/layers/__tests__/ScrollArea.test.tsx
/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    expect(container.firstChild).toHaveClass('scroll-area');
  });

  it('applies scrollbarWidth prop', () => {
    const { container } = render(<ScrollArea scrollbarWidth="thick">Content</ScrollArea>);
    // Checked via style because class implementation might vary
    expect(container.firstChild).toHaveStyle({ '--scrollbar-size': '0.75rem' });
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

  it('shows scrollbar on hover over the scrollbar area', () => {
    const { container } = render(<ScrollArea showOnHover={true}>Content</ScrollArea>);
    const element = container.firstChild as HTMLElement;

    Object.defineProperty(element, 'scrollHeight', { value: 200, configurable: true });
    Object.defineProperty(element, 'clientHeight', { value: 100, configurable: true });
    element.getBoundingClientRect = (): DOMRect =>
      ({
        left: 0,
        right: 100,
        top: 0,
        bottom: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => '',
      }) as DOMRect;

    fireEvent.mouseMove(element, { clientX: 99, clientY: 50 });
    expect(element).toHaveAttribute('data-scrollbar-visible', 'true');

    fireEvent.mouseMove(element, { clientX: 50, clientY: 50 });
    expect(element).toHaveAttribute('data-scrollbar-visible', 'true');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(element).toHaveAttribute('data-scrollbar-visible', 'false');
  });

  it('keeps scrollbar visible when hideDelay is 0', () => {
    const { container } = render(<ScrollArea hideDelay={0}>Content</ScrollArea>);
    expect(container.firstChild).toHaveAttribute('data-scrollbar-visible', 'true');
  });

  it('forwards ref to scroll container', () => {
    const ref = { current: null };
    render(<ScrollArea ref={ref}>Content</ScrollArea>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('applies default scrollbar width (thin)', () => {
    const { container } = render(<ScrollArea>Content</ScrollArea>);
    expect(container.firstChild).toHaveStyle({ '--scrollbar-size': '0.25rem' });
  });

  it('applies normal scrollbar width', () => {
    const { container } = render(<ScrollArea scrollbarWidth="normal">Content</ScrollArea>);
    expect(container.firstChild).toHaveStyle({ '--scrollbar-size': '0.5rem' });
  });

  it('does not show scrollbar on hover when showOnHover is false', () => {
    const { container } = render(<ScrollArea showOnHover={false}>Content</ScrollArea>);
    const element = container.firstChild as HTMLElement;

    fireEvent.mouseMove(element, { clientX: 99, clientY: 50 });

    // Should not change visibility when showOnHover is disabled
    expect(element).toHaveAttribute('data-scrollbar-hover', 'false');
  });

  it('cleans up timeout on unmount', () => {
    const { unmount } = render(<ScrollArea hideDelay={1000}>Content</ScrollArea>);
    unmount();
    // No error should occur after unmount
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it('hides scrollbar on mouseLeave after hover', () => {
    const { container } = render(<ScrollArea showOnHover={true}>Content</ScrollArea>);
    const element = container.firstChild as HTMLElement;

    Object.defineProperty(element, 'scrollHeight', { value: 200, configurable: true });
    Object.defineProperty(element, 'clientHeight', { value: 100, configurable: true });
    element.getBoundingClientRect = (): DOMRect =>
      ({
        left: 0,
        right: 100,
        top: 0,
        bottom: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => '',
      }) as DOMRect;

    // Hover over scrollbar area
    fireEvent.mouseMove(element, { clientX: 99, clientY: 50 });
    expect(element).toHaveAttribute('data-scrollbar-visible', 'true');

    // Leave the element
    fireEvent.mouseLeave(element);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(element).toHaveAttribute('data-scrollbar-visible', 'false');
  });
});
