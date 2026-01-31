// shared/ui/src/layouts/layers/ScrollArea.tsx
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import '../../styles/components.css';

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
    hideDelay = 2000,
    showOnHover = true,
    className = '',
    style,
    ...rest
  } = props;

  const [isActive, setIsActive] = useState(false);
  const [isHoveringScrollbar, setIsHoveringScrollbar] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoverRef = useRef(false);

  const clearHideTimer = (): void => {
    clearTimeout(timeoutRef.current);
  };

  const scheduleHide = (): void => {
    if (hideDelay <= 0) {
      return;
    }

    clearHideTimer();

    timeoutRef.current = setTimeout((): void => {
      setIsActive(false);
    }, hideDelay);
  };

  const handleScroll = (): void => {
    setIsActive(true);
    scheduleHide();
  };

  useEffect(() => {
    return (): void => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const scrollbarSize = {
    thin: '0.25rem',
    normal: '0.5rem',
    thick: '0.75rem',
  }[scrollbarWidth];

  // Convert rem to pixels for hover detection (base font size is 16px)
  const scrollbarSizePx = Number.parseFloat(scrollbarSize) * 16;
  const showScrollbar = hideDelay === 0 || isActive;

  return (
    <div
      ref={ref}
      className={`scroll-area ${className}`.trim()}
      onScroll={handleScroll}
      onMouseMove={(event): void => {
        if (!showOnHover) {
          return;
        }

        const element = event.currentTarget;
        const rect = element.getBoundingClientRect();
        const isVertical = element.scrollHeight > element.clientHeight;
        const isHorizontal = element.scrollWidth > element.clientWidth;
        const overVertical =
          isVertical &&
          event.clientX >= rect.right - scrollbarSizePx &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;
        const overHorizontal =
          isHorizontal &&
          event.clientY >= rect.bottom - scrollbarSizePx &&
          event.clientY <= rect.bottom &&
          event.clientX >= rect.left &&
          event.clientX <= rect.right;
        const hovering = overVertical || overHorizontal;

        if (hovering !== hoverRef.current) {
          hoverRef.current = hovering;
          setIsHoveringScrollbar(hovering);

          if (hovering) {
            clearHideTimer();
            setIsActive(true);
          } else {
            scheduleHide();
          }
        }
      }}
      onMouseLeave={(): void => {
        if (!showOnHover) {
          return;
        }

        if (hoverRef.current) {
          hoverRef.current = false;
          setIsHoveringScrollbar(false);
          scheduleHide();
        }
      }}
      data-scrollbar-visible={showScrollbar}
      data-scrollbar-hover={isHoveringScrollbar}
      style={{
        maxHeight,
        maxWidth,
        overflow: 'auto',
        position: 'relative',
        // Custom scrollbar styles for WebKit browsers
        ['--scrollbar-size' as string]: scrollbarSize,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
});

ScrollArea.displayName = 'ScrollArea';
