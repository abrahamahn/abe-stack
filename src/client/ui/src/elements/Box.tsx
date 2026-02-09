// src/client/ui/src/elements/Box.tsx
import { cn } from '@utils/cn';
import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import '../styles/elements.css';

export type BoxProps = {
  /** Content to render inside the box */
  children?: ReactNode;
  /** Additional inline styles (merged with layout styles) */
  style?: CSSProperties;
  /** CSS class name for custom styling */
  className?: string;
  /** Padding value (CSS value or number for pixels) */
  padding?: number | string;
  /** Flex direction for child layout */
  flexDirection?: 'row' | 'column';
};

/**
 * A flexible container component for creating simple flex-based layouts.
 *
 * @example
 * ```tsx
 * <Box flexDirection="row" padding={16}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </Box>
 * ```
 */
const Box = forwardRef<HTMLDivElement, BoxProps>((props, ref) => {
  const { children, style, className, padding, flexDirection } = props;
  const boxPadding = typeof padding === 'number' ? `${String(padding)}px` : padding;
  const combinedStyle: CSSProperties = {
    ...(flexDirection != null ? { ['--ui-box-direction']: flexDirection } : {}),
    ...(boxPadding != null ? { ['--ui-box-padding']: boxPadding } : {}),
    ...style,
  };

  return (
    <div ref={ref} className={cn('box', className)} style={combinedStyle}>
      {children}
    </div>
  );
});

Box.displayName = 'Box';

export { Box };
