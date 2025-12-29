import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type MouseEvent,
} from 'react';
import './primitives.css';

type ResizablePanelProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * Panel children
   */
  children: ReactNode;
  /**
   * Default size as percentage (0-100)
   * @default 50
   */
  defaultSize?: number;
  /**
   * Minimum size as percentage (0-100)
   * @default 10
   */
  minSize?: number;
  /**
   * Maximum size as percentage (0-100)
   * @default 90
   */
  maxSize?: number;
  /**
   * Resize direction
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical';
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
};

/**
 * Resizable separator/handle for dragging between panels
 */
export const ResizableSeparator = forwardRef<HTMLDivElement, ResizableSeparatorProps>(
  (props, ref) => {
    const { direction = 'horizontal', onResize, className = '', ...rest } = props;
    const [isDragging, setIsDragging] = useState(false);
    const startPosRef = useRef<number>(0);

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
      e.preventDefault();
      setIsDragging(true);
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
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return (): void => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, direction, onResize]);

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
    direction = 'horizontal',
    onResize,
    className = '',
    style,
    ...rest
  } = props;

  const [size, setSize] = useState(defaultSize);

  const handleResize = (delta: number): void => {
    setSize((prevSize) => {
      const container = direction === 'horizontal' ? window.innerWidth : window.innerHeight;
      const deltaPercent = (delta / container) * 100;
      const newSize = Math.max(minSize, Math.min(maxSize, prevSize + deltaPercent));
      onResize?.(newSize);
      return newSize;
    });
  };

  const flexBasis = `${size.toString()}%`;

  return (
    <>
      <div
        ref={ref}
        className={`ui-resizable-panel ${className}`.trim()}
        style={{
          flexBasis,
          flexShrink: 0,
          flexGrow: 0,
          overflow: 'auto',
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
      <ResizableSeparator direction={direction} onResize={handleResize} />
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
