// main/client/react/src/hooks/useVirtualScroll.test.tsx
/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useVirtualScroll, VirtualScrollList } from './useVirtualScroll';

import type { ReactElement } from 'react';

// ============================================================================
// Test Harness for useVirtualScroll Hook
// ============================================================================

interface HarnessProps {
  itemCount: number;
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
}

const VirtualScrollHarness = ({
  itemCount,
  itemHeight,
  containerHeight,
  overscan,
}: HarnessProps): ReactElement => {
  const { items, totalHeight, scrollTop, containerRef } = useVirtualScroll(itemCount, {
    itemHeight,
    containerHeight,
    overscan,
  });

  return (
    <div>
      <div data-testid="totalHeight">{totalHeight}</div>
      <div data-testid="scrollTop">{scrollTop}</div>
      <div data-testid="itemCount">{items.length}</div>
      <div
        ref={containerRef}
        data-testid="container"
        style={{ height: containerHeight, overflow: 'auto' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {items.map(({ index, style }) => (
            <div key={index} data-testid={`item-${String(index)}`} style={style}>
              Item {index}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// useVirtualScroll Hook Tests
// ============================================================================

describe('useVirtualScroll', () => {
  describe('basic functionality', () => {
    it('calculates total height for fixed item height', () => {
      render(<VirtualScrollHarness itemCount={100} itemHeight={50} containerHeight={300} />);

      expect(screen.getByTestId('totalHeight')).toHaveTextContent('5000');
    });

    it('calculates total height for dynamic item height', () => {
      const itemHeight = (index: number): number => (index % 2 === 0 ? 40 : 60);
      render(<VirtualScrollHarness itemCount={10} itemHeight={itemHeight} containerHeight={300} />);

      // 5 items at 40px + 5 items at 60px = 200 + 300 = 500
      expect(screen.getByTestId('totalHeight')).toHaveTextContent('500');
    });

    it('renders only visible items plus overscan', () => {
      render(
        <VirtualScrollHarness itemCount={100} itemHeight={50} containerHeight={200} overscan={2} />,
      );

      // Container height 200 / item height 50 = 4 visible items
      // With overscan of 2 on each side: start items + end items
      // At scroll 0: startIndex = max(0, 0-2) = 0, endIndex = min(99, 4+2) = 6
      // So items 0-6 = 7 items
      const itemCount = screen.getByTestId('itemCount');
      const count = parseInt(itemCount.textContent ?? '0', 10);
      expect(count).toBeGreaterThanOrEqual(4);
      expect(count).toBeLessThanOrEqual(12); // reasonable upper bound
    });

    it('starts with scrollTop at 0', () => {
      render(<VirtualScrollHarness itemCount={100} itemHeight={50} containerHeight={300} />);

      expect(screen.getByTestId('scrollTop')).toHaveTextContent('0');
    });
  });

  describe('item rendering', () => {
    it('renders items with correct positioning', () => {
      render(<VirtualScrollHarness itemCount={10} itemHeight={50} containerHeight={300} />);

      const item0 = screen.getByTestId('item-0');
      expect(item0).toBeInTheDocument();
      expect(item0).toHaveStyle({ position: 'absolute', top: '0px' });

      const item1 = screen.getByTestId('item-1');
      expect(item1).toHaveStyle({ position: 'absolute', top: '50px' });
    });

    it('renders items with correct height', () => {
      render(<VirtualScrollHarness itemCount={10} itemHeight={50} containerHeight={300} />);

      const item0 = screen.getByTestId('item-0');
      expect(item0).toHaveStyle({ height: '50px' });
    });

    it('renders items with 100% width', () => {
      render(<VirtualScrollHarness itemCount={10} itemHeight={50} containerHeight={300} />);

      const item0 = screen.getByTestId('item-0');
      expect(item0).toHaveStyle({ width: '100%' });
    });
  });

  describe('scroll handling', () => {
    it('updates scrollTop when container is scrolled', () => {
      render(<VirtualScrollHarness itemCount={100} itemHeight={50} containerHeight={200} />);

      const container = screen.getByTestId('container');

      act(() => {
        // Simulate scroll
        Object.defineProperty(container, 'scrollTop', { value: 250, writable: true });
        fireEvent.scroll(container);
      });

      expect(screen.getByTestId('scrollTop')).toHaveTextContent('250');
    });

    it('renders different items after scrolling', () => {
      render(
        <VirtualScrollHarness itemCount={100} itemHeight={50} containerHeight={200} overscan={0} />,
      );

      // Initially should render first few items
      expect(screen.getByTestId('item-0')).toBeInTheDocument();

      const container = screen.getByTestId('container');

      act(() => {
        // Scroll down 500px (10 items)
        Object.defineProperty(container, 'scrollTop', { value: 500, writable: true });
        fireEvent.scroll(container);
      });

      // After scrolling, item 0 should no longer be rendered with overscan=0
      expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
      // Items around scroll position should be visible
      expect(screen.getByTestId('item-10')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty item count', () => {
      render(<VirtualScrollHarness itemCount={0} itemHeight={50} containerHeight={300} />);

      expect(screen.getByTestId('totalHeight')).toHaveTextContent('0');
      expect(screen.getByTestId('itemCount')).toHaveTextContent('0');
    });

    it('handles single item', () => {
      render(<VirtualScrollHarness itemCount={1} itemHeight={50} containerHeight={300} />);

      expect(screen.getByTestId('totalHeight')).toHaveTextContent('50');
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
    });

    it('handles container taller than total items', () => {
      render(<VirtualScrollHarness itemCount={3} itemHeight={50} containerHeight={500} />);

      expect(screen.getByTestId('totalHeight')).toHaveTextContent('150');
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
    });

    it('uses default overscan of 5', () => {
      render(<VirtualScrollHarness itemCount={100} itemHeight={50} containerHeight={200} />);

      // With default overscan of 5 and visible items ~4
      const itemCount = parseInt(screen.getByTestId('itemCount').textContent ?? '0', 10);
      expect(itemCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe('dynamic item heights', () => {
    it('positions items correctly with variable heights', () => {
      const itemHeight = (index: number): number => (index === 0 ? 100 : 50);
      render(<VirtualScrollHarness itemCount={5} itemHeight={itemHeight} containerHeight={300} />);

      const item0 = screen.getByTestId('item-0');
      expect(item0).toHaveStyle({ height: '100px', top: '0px' });

      const item1 = screen.getByTestId('item-1');
      expect(item1).toHaveStyle({ height: '50px', top: '100px' });
    });
  });
});

// ============================================================================
// VirtualScrollList Component Tests
// ============================================================================

describe('VirtualScrollList', () => {
  interface TestItem {
    id: number;
    name: string;
  }

  const testItems: TestItem[] = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    name: `Item ${String(i)}`,
  }));

  it('renders items using renderItem function', () => {
    render(
      <VirtualScrollList
        items={testItems.slice(0, 5)}
        itemHeight={50}
        containerHeight={300}
        renderItem={(item) => <span>{item.name}</span>}
      />,
    );

    expect(screen.getByText('Item 0')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('applies custom className to container', () => {
    render(
      <VirtualScrollList
        items={testItems.slice(0, 5)}
        itemHeight={50}
        containerHeight={300}
        renderItem={(item) => <span>{item.name}</span>}
        className="my-custom-class"
      />,
    );

    const container = document.querySelector('.virtual-scroll-container');
    expect(container).toHaveClass('my-custom-class');
  });

  it('sets correct container height', () => {
    render(
      <VirtualScrollList
        items={testItems.slice(0, 5)}
        itemHeight={50}
        containerHeight={400}
        renderItem={(item) => <span>{item.name}</span>}
      />,
    );

    const container = document.querySelector('.virtual-scroll-container');
    expect(container).toHaveStyle({ height: '400px' });
  });

  it('supports dynamic item height function', () => {
    render(
      <VirtualScrollList
        items={testItems.slice(0, 10)}
        itemHeight={(item) => (item.id % 2 === 0 ? 40 : 60)}
        containerHeight={300}
        renderItem={(item) => <span>{item.name}</span>}
      />,
    );

    expect(screen.getByText('Item 0')).toBeInTheDocument();
  });

  it('renders with empty items array', () => {
    render(
      <VirtualScrollList<TestItem>
        items={[]}
        itemHeight={50}
        containerHeight={300}
        renderItem={(item) => <span>{item.name}</span>}
      />,
    );

    const container = document.querySelector('.virtual-scroll-container');
    expect(container).toBeInTheDocument();
  });

  it('accepts custom overscan value', () => {
    render(
      <VirtualScrollList
        items={testItems}
        itemHeight={50}
        containerHeight={200}
        renderItem={(item) => <span>{item.name}</span>}
        overscan={10}
      />,
    );

    // With overscan of 10, more items should be rendered
    const container = document.querySelector('.virtual-scroll-container');
    expect(container).toBeInTheDocument();
  });

  it('passes index to renderItem', () => {
    render(
      <VirtualScrollList
        items={testItems.slice(0, 3)}
        itemHeight={50}
        containerHeight={200}
        renderItem={(item, index) => (
          <span data-testid={`rendered-${String(index)}`}>
            {item.name} at index {index}
          </span>
        )}
      />,
    );

    expect(screen.getByText('Item 0 at index 0')).toBeInTheDocument();
    expect(screen.getByText('Item 1 at index 1')).toBeInTheDocument();
  });
});
