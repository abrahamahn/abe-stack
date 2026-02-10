// src/client/ui/src/layouts/shells/ResizablePanel.tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import '../../styles/components.css';

/** Step size for keyboard resize (percentage or pixels based on unit) */
const KEYBOARD_STEP = 2;
/** Large step size for Shift+Arrow keyboard resize */
const KEYBOARD_STEP_LARGE = 10;

type ResizablePanelProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * Panel children
   */
  children: ReactNode;
  /**
   * Controlled size as percentage (0-100) or pixels
   * When provided, component is controlled
   */
  size?: number | undefined;
  /**
   * Default size as percentage (0-100) or pixels (uncontrolled mode)
   * @default 50
   */
  defaultSize?: number | undefined;
  /**
   * Minimum size as percentage (0-100) or pixels
   * @default 10
   */
  minSize?: number | undefined;
  /**
   * Maximum size as percentage (0-100) or pixels
   * @default 90
   */
  maxSize?: number | undefined;
  /**
   * Unit for size values ('%' or 'px')
   * @default '%'
   */
  unit?: '%' | 'px' | undefined;
  /**
   * Whether the panel is collapsed
   */
  collapsed?: boolean | undefined;
  /**
   * Resize direction
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical' | undefined;
  /**
   * Reverse the resize delta direction
   * @default false
   */
  invertResize?: boolean | undefined;
  /**
   * Callback when panel size changes
   */
  onResize?: ((size: number) => void) | undefined;
};

type ResizablePanelGroupProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * Panel children (should be ResizablePanel components)
   */
  children: ReactNode;
  /**
   * Layout direction
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical' | undefined;
  /**
   * Reverse the panel order (row-reverse or column-reverse)
   * @default false
   */
  reverse?: boolean | undefined;
};

type ResizableSeparatorProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * Direction of resize
   */
  direction?: 'horizontal' | 'vertical' | undefined;
  /**
   * Handler callback for resize delta (mouse drag)
   */
  onResize?: ((delta: number) => void) | undefined;
  /**
   * Handler callback for direct size setting (keyboard)
   */
  onSizeChange?: ((size: number) => void) | undefined;
  /**
   * Callback when drag starts
   */
  onDragStart?: () => void;
  /**
   * Callback when drag ends
   */
  onDragEnd?: () => void;
  /**
   * Current size value for ARIA attributes
   */
  currentSize?: number;
  /**
   * Minimum size value for ARIA attributes
   */
  minSize?: number;
  /**
   * Maximum size value for ARIA attributes
   */
  maxSize?: number;
  /**
   * Size unit for calculating keyboard steps
   */
  unit?: '%' | 'px';
  /**
   * Accessible label for the separator
   */
  ['aria-label']?: string;
};

/**
 * Resizable separator/handle for dragging between panels.
 *
 * Supports keyboard navigation:
 * - Arrow keys: Resize by small step (2%)
 * - Shift + Arrow keys: Resize by large step (10%)
 * - Home: Jump to minimum size
 * - End: Jump to maximum size
 */
export const ResizableSeparator = forwardRef<HTMLDivElement, ResizableSeparatorProps>(
  (props, ref) => {
    const {
      direction = 'horizontal',
      onResize,
      onSizeChange,
      onDragStart,
      onDragEnd,
      currentSize,
      minSize = 10,
      maxSize = 90,
      unit = '%',
      'aria-label': ariaLabel,
      className = '',
      ...rest
    } = props;
    const [isDragging, setIsDragging] = useState(false);
    const startPosRef = useRef<number>(0);
    const onResizeRef = useRef(onResize);
    onResizeRef.current = onResize;
    const onDragEndRef = useRef(onDragEnd);
    onDragEndRef.current = onDragEnd;

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
      e.preventDefault();
      setIsDragging(true);
      onDragStart?.();
      startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    };

    // Keyboard handler for accessibility
    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>): void => {
        if (currentSize === undefined || onSizeChange == null) return;

        const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
        let newSize: number | null = null;

        // Arrow keys increase/decrease based on direction
        // Horizontal: Right/Down increase, Left/Up decrease
        // Vertical: Down/Right increase, Up/Left decrease
        switch (e.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            e.preventDefault();
            newSize = Math.min(maxSize, currentSize + step);
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault();
            newSize = Math.max(minSize, currentSize - step);
            break;
          case 'Home':
            e.preventDefault();
            newSize = minSize;
            break;
          case 'End':
            e.preventDefault();
            newSize = maxSize;
            break;
        }

        if (newSize !== null && newSize !== currentSize) {
          onSizeChange(newSize);
        }
      },
      [currentSize, maxSize, minSize, onSizeChange],
    );

    useEffect(() => {
      if (!isDragging) return;

      const handleMouseMove = (e: globalThis.MouseEvent): void => {
        const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
        const delta = currentPos - startPosRef.current;
        startPosRef.current = currentPos;
        onResizeRef.current?.(delta);
      };

      const handleMouseUp = (): void => {
        setIsDragging(false);
        onDragEndRef.current?.();
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return (): void => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, direction]);

    // Generate accessible label
    const defaultLabel = direction === 'horizontal' ? 'Resize panel width' : 'Resize panel height';
    const sizeText = currentSize !== undefined ? ` (current: ${String(currentSize)}${unit})` : '';

    return (
      <div
        ref={ref}
        className={`resizable-separator ${isDragging ? 'dragging' : ''} ${className}`.trim()}
        data-direction={direction}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        role="separator"
        tabIndex={0}
        aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
        aria-valuenow={currentSize}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        aria-label={ariaLabel ?? `${defaultLabel}${sizeText}`}
        {...rest}
      />
    );
  },
);

ResizableSeparator.displayName = 'ResizableSeparator';

/**
 * Individual resizable panel with keyboard-accessible resize handle.
 *
 * @example
 * ```tsx
 * <ResizablePanelGroup direction="horizontal">
 *   <ResizablePanel defaultSize={30} minSize={20}>
 *     Sidebar content
 *   </ResizablePanel>
 *   <ResizablePanel defaultSize={70}>
 *     Main content
 *   </ResizablePanel>
 * </ResizablePanelGroup>
 * ```
 */
export const ResizablePanel = forwardRef<HTMLDivElement, ResizablePanelProps>((props, ref) => {
  const {
    children,
    size: controlledSize,
    defaultSize = 50,
    minSize = 10,
    maxSize = 90,
    unit = '%',
    collapsed = false,
    direction = 'horizontal',
    invertResize = false,
    onResize,
    className = '',
    style,
    ...rest
  } = props;

  const isControlled = controlledSize !== undefined;
  const [internalSize, setInternalSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const size = isControlled ? controlledSize : internalSize;

  // Handle mouse drag resize (delta-based)
  const handleResize = useCallback(
    (delta: number): void => {
      const adjustedDelta = invertResize ? -delta : delta;
      const prevSize = size;

      let newSize: number;
      if (unit === 'px') {
        newSize = Math.max(minSize, Math.min(maxSize, prevSize + adjustedDelta));
      } else {
        const containerEl = panelRef.current?.parentElement;
        const containerSize =
          containerEl != null
            ? direction === 'horizontal'
              ? containerEl.clientWidth
              : containerEl.clientHeight
            : direction === 'horizontal'
              ? window.innerWidth
              : window.innerHeight;
        const deltaPercent = (adjustedDelta / containerSize) * 100;
        newSize = Math.max(minSize, Math.min(maxSize, prevSize + deltaPercent));
      }

      if (!isControlled) {
        setInternalSize(newSize);
      }
      onResize?.(newSize);
    },
    [direction, invertResize, isControlled, maxSize, minSize, onResize, size, unit],
  );

  // Handle keyboard resize (direct size setting)
  const handleSizeChange = useCallback(
    (newSize: number): void => {
      const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
      if (!isControlled) {
        setInternalSize(clampedSize);
      }
      onResize?.(clampedSize);
    },
    [isControlled, maxSize, minSize, onResize],
  );

  const currentSize = collapsed ? 0 : size;
  const flexBasis = unit === 'px' ? `${String(currentSize)}px` : `${String(currentSize)}%`;
  const panelStyle = {
    flexBasis,
    flexShrink: 0,
    flexGrow: 0,
    transition: isDragging ? 'none' : 'flex-basis 0.3s ease',
    ...style,
    ...(collapsed
      ? {
          borderTop: 'none',
          borderBottom: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          padding: 0,
          overflow: 'hidden',
        }
      : {}),
  };

  // Extract any non-DOM attributes to avoid React warnings
  const domProps = rest;

  // Merge forwarded ref with internal panelRef
  const mergedRef = useCallback(
    (node: HTMLDivElement | null): void => {
      (panelRef as { current: HTMLDivElement | null }).current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref !== null) {
        (ref as { current: HTMLDivElement | null }).current = node;
      }
    },
    [ref],
  );

  return (
    <>
      <div
        ref={mergedRef}
        className={`resizable-panel ${className}`.trim()}
        style={panelStyle}
        {...domProps}
      >
        {children}
      </div>
      {!collapsed && (
        <ResizableSeparator
          direction={direction}
          onResize={handleResize}
          onSizeChange={handleSizeChange}
          onDragStart={() => {
            setIsDragging(true);
          }}
          onDragEnd={() => {
            setIsDragging(false);
          }}
          currentSize={size}
          minSize={minSize}
          maxSize={maxSize}
          unit={unit}
        />
      )}
    </>
  );
});

ResizablePanel.displayName = 'ResizablePanel';

/**
 * Container for resizable panels
 *
 * @example
 * ```tsx
 * <ResizablePanelGroup direction="horizontal">
 *   <ResizablePanel defaultSize={30} minSize={20}>
 *     Sidebar
 *   </ResizablePanel>
 *   <ResizablePanel defaultSize={70}>
 *     Main content
 *   </ResizablePanel>
 * </ResizablePanelGroup>
 * ```
 */
export const ResizablePanelGroup = forwardRef<HTMLDivElement, ResizablePanelGroupProps>(
  (props, ref) => {
    const {
      children,
      direction = 'horizontal',
      reverse = false,
      className = '',
      style,
      ...rest
    } = props;

    const getFlexDirection = (): 'row' | 'row-reverse' | 'column' | 'column-reverse' => {
      if (direction === 'horizontal') {
        return reverse ? 'row-reverse' : 'row';
      }
      return reverse ? 'column-reverse' : 'column';
    };

    return (
      <div
        ref={ref}
        className={`resizable-panel-group ${className}`.trim()}
        style={{
          display: 'flex',
          flexDirection: getFlexDirection(),
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

ResizablePanelGroup.displayName = 'ResizablePanelGroup';
