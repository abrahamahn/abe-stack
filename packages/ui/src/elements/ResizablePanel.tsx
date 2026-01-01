import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type ReactNode,
} from 'react';
import '../styles/elements.css';

type ResizablePanelProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * Panel children
   */
  children: ReactNode;
  /**
   * Default size as percentage (0-100) or pixels
   * @default 50
   */
  defaultSize?: number;
  /**
   * Minimum size as percentage (0-100) or pixels
   * @default 10
   */
  minSize?: number;
  /**
   * Maximum size as percentage (0-100) or pixels
   * @default 90
   */
  maxSize?: number;
  /**
   * Unit for size values ('%' or 'px')
   * @default '%'
   */
  unit?: '%' | 'px';
  /**
   * Whether the panel is collapsed
   */
  collapsed?: boolean;
  /**
   * Resize direction
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical';
  /**
   * Reverse the resize delta direction
   * @default false
   */
  invertResize?: boolean;
  /**
   * Callback when panel size changes
   */
  onResize?: (size: number) => void;
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
  direction?: 'horizontal' | 'vertical';
};

type ResizableSeparatorProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * Direction of resize
   */
  direction?: 'horizontal' | 'vertical';
  /**
   * Handler callback for resize
   */
  onResize?: (delta: number) => void;
  /**
   * Callback when drag starts
   */
  onDragStart?: () => void;
  /**
   * Callback when drag ends
   */
  onDragEnd?: () => void;
};

/**
 * Resizable separator/handle for dragging between panels
 */
export const ResizableSeparator = forwardRef<HTMLDivElement, ResizableSeparatorProps>(
  (props, ref) => {
    const {
      direction = 'horizontal',
      onResize,
      onDragStart,
      onDragEnd,
      className = '',
      ...rest
    } = props;
    const [isDragging, setIsDragging] = useState(false);
    const startPosRef = useRef<number>(0);

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
      e.preventDefault();
      setIsDragging(true);
      onDragStart?.();
      startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    };

    useEffect(() => {
      if (!isDragging) return;

      const handleMouseMove = (e: globalThis.MouseEvent): void => {
        const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
        const delta = currentPos - startPosRef.current;
        startPosRef.current = currentPos;
        onResize?.(delta);
      };

      const handleMouseUp = (): void => {
        setIsDragging(false);
        onDragEnd?.();
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return (): void => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, direction, onResize, onDragEnd]);

    return (
      <div
        ref={ref}
        className={`ui-resizable-separator ${isDragging ? 'dragging' : ''} ${className}`.trim()}
        data-direction={direction}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
        {...rest}
      />
    );
  },
);

ResizableSeparator.displayName = 'ResizableSeparator';

/**
 * Individual resizable panel
 */
export const ResizablePanel = forwardRef<HTMLDivElement, ResizablePanelProps>((props, ref) => {
  const {
    children,
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

  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);

  const handleResize = (delta: number): void => {
    const adjustedDelta = invertResize ? -delta : delta;
    setSize((prevSize) => {
      let newSize: number;

      if (unit === 'px') {
        newSize = Math.max(minSize, Math.min(maxSize, prevSize + adjustedDelta));
      } else {
        const container = direction === 'horizontal' ? window.innerWidth : window.innerHeight;
        const deltaPercent = (adjustedDelta / container) * 100;
        newSize = Math.max(minSize, Math.min(maxSize, prevSize + deltaPercent));
      }

      onResize?.(newSize);
      return newSize;
    });
  };

  const currentSize = collapsed ? 0 : size;
  const flexBasis = unit === 'px' ? `${String(currentSize)}px` : `${String(currentSize)}%`;
  const panelStyle = {
    flexBasis,
    flexShrink: 0,
    flexGrow: 0,
    transition: isDragging ? 'none' : 'flex-basis 0.3s ease',
    ...style,
    ...(collapsed ? { border: 'none', padding: 0, overflow: 'hidden' } : {}),
  };

  return (
    <>
      <div
        ref={ref}
        className={`ui-resizable-panel ${className}`.trim()}
        style={panelStyle}
        {...rest}
      >
        {children}
      </div>
      {!collapsed && (
        <ResizableSeparator
          direction={direction}
          onResize={handleResize}
          onDragStart={() => {
            setIsDragging(true);
          }}
          onDragEnd={() => {
            setIsDragging(false);
          }}
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
    const { children, direction = 'horizontal', className = '', style, ...rest } = props;

    return (
      <div
        ref={ref}
        className={`ui-resizable-panel-group ${className}`.trim()}
        style={{
          display: 'flex',
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
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
