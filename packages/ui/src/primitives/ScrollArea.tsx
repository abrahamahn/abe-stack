import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import './primitives.css';

type ScrollAreaProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * Content to be scrollable
   */
  children: ReactNode;
  /**
   * Maximum height of the scroll area
   */
  maxHeight?: string | number;
  /**
   * Maximum width of the scroll area
   */
  maxWidth?: string | number;
  /**
   * Scrollbar width
   * @default 'thin'
   */
  scrollbarWidth?: 'thin' | 'normal' | 'thick';
  /**
   * Auto-hide scrollbar after this delay (ms). Set to 0 to disable auto-hide.
   * @default 1000
   */
  hideDelay?: number;
  /**
   * Show scrollbar on hover
   * @default true
   */
  showOnHover?: boolean;
};

/**
 * Custom scrollbar component with consistent cross-browser styling.
 * Supports auto-hide, theming, and smooth scrolling.
 *
 * @example
 * ```tsx
 * <ScrollArea maxHeight="400px" scrollbarWidth="thin">
 *   <div>Long content here...</div>
 * </ScrollArea>
 * ```
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>((props, ref) => {
  const {
    children,
    maxHeight,
    maxWidth,
    scrollbarWidth = 'thin',
    hideDelay = 1000,
    showOnHover = true,
    className = '',
    style,
    ...rest
  } = props;

  const [isScrolling, setIsScrolling] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleScroll = (): void => {
    setIsScrolling(true);

    clearTimeout(timeoutRef.current);

    if (hideDelay > 0) {
      timeoutRef.current = setTimeout((): void => {
        setIsScrolling(false);
      }, hideDelay);
    }
  };

  useEffect(() => {
    return (): void => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const scrollbarSize = {
    thin: '6px',
    normal: '10px',
    thick: '14px',
  }[scrollbarWidth];

  const showScrollbar = !hideDelay || isScrolling || (showOnHover && isHovered);

  return (
    <div
      ref={ref}
      className={`ui-scroll-area ${className}`.trim()}
      onScroll={handleScroll}
      onMouseEnter={(): void => {
        setIsHovered(true);
      }}
      onMouseLeave={(): void => {
        setIsHovered(false);
      }}
      data-scrollbar-visible={showScrollbar}
      style={{
        maxHeight,
        maxWidth,
        overflow: 'auto',
        position: 'relative',
        scrollbarWidth: scrollbarWidth === 'thin' ? 'thin' : 'auto',
        scrollbarColor: 'var(--gray6, #9ca3af) var(--gray2, #f3f4f6)',
        // Custom scrollbar styles for WebKit browsers
        ['--scrollbar-size' as string]: scrollbarSize,
        ['--scrollbar-opacity' as string]: showScrollbar ? '1' : '0',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
});

ScrollArea.displayName = 'ScrollArea';
