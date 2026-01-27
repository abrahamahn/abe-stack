// packages/ui/src/hooks/useVirtualScroll.tsx
/**
 * Virtual Scrolling Hook
 *
 * Efficiently render large lists by only rendering visible items.
 * Supports dynamic item heights and smooth scrolling.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface VirtualScrollOptions {
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  dynamicHeight?: boolean;
}

export interface VirtualScrollItem {
  index: number;
  style: React.CSSProperties;
}

export interface VirtualScrollResult {
  items: VirtualScrollItem[];
  totalHeight: number;
  scrollTop: number;
  setScrollTop: (scrollTop: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook for virtual scrolling implementation
 */
export function useVirtualScroll(
  itemCount: number,
  options: VirtualScrollOptions,
): VirtualScrollResult {
  const { itemHeight, containerHeight, overscan = 5 } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const getVisibleRange = useCallback((): { startIndex: number; endIndex: number } => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / (typeof itemHeight === 'number' ? itemHeight : 50)) - overscan,
    );
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil(
        (scrollTop + containerHeight) / (typeof itemHeight === 'number' ? itemHeight : 50),
      ) + overscan,
    );

    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, itemCount, overscan]);

  // Calculate items to render
  const items = useCallback((): VirtualScrollItem[] => {
    const { startIndex, endIndex } = getVisibleRange();
    const result: VirtualScrollItem[] = [];

    let currentTop = 0;

    // Calculate position for each item
    for (let i = 0; i < itemCount; i++) {
      const height = typeof itemHeight === 'number' ? itemHeight : itemHeight(i);

      if (i >= startIndex && i <= endIndex) {
        result.push({
          index: i,
          style: {
            position: 'absolute',
            top: currentTop,
            height,
            width: '100%',
          },
        });
      }

      currentTop += height;
    }

    return result;
  }, [itemCount, itemHeight, getVisibleRange]);

  // Calculate total height
  const totalHeight = useCallback((): number => {
    let height = 0;
    for (let i = 0; i < itemCount; i++) {
      height += typeof itemHeight === 'number' ? itemHeight : itemHeight(i);
    }
    return height;
  }, [itemCount, itemHeight]);

  // Handle scroll events
  const handleScroll = useCallback((event: Event): void => {
    const target = event.target as HTMLElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container !== null) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return (): void => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
    return undefined;
  }, [handleScroll]);

  return {
    items: items(),
    totalHeight: totalHeight(),
    scrollTop,
    setScrollTop,
    containerRef,
  };
}

// ============================================================================
// Virtual Scroll Component
// ============================================================================

export interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number | ((item: T, index: number) => number);
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

/**
 * Virtual scroll list component
 */
export function VirtualScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5,
}: VirtualScrollListProps<T>): React.ReactElement {
  const itemHeightFn =
    typeof itemHeight === 'function'
      ? (index: number): number => itemHeight(items[index] as T, index)
      : itemHeight;

  const {
    items: visibleItems,
    totalHeight,
    containerRef,
  } = useVirtualScroll(items.length, {
    itemHeight: itemHeightFn,
    containerHeight,
    overscan,
  });

  return (
    <div
      ref={containerRef}
      className={`virtual-scroll-container ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ index, style }) => (
          <div key={index} style={style}>
            {renderItem(items[index] as T, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
