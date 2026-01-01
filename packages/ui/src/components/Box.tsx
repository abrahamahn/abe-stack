import { cn } from '../utils/cn';

import '../styles/components.css';
import type { ReactNode, CSSProperties, ReactElement } from 'react';

export interface BoxProps {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  padding?: number | string;
  flexDirection?: 'row' | 'column';
}

export const Box = ({
  children,
  style,
  className,
  padding,
  flexDirection,
}: BoxProps): ReactElement => {
  const boxPadding = typeof padding === 'number' ? `${String(padding)}px` : padding;
  const combinedStyle: CSSProperties = {
    ...(flexDirection ? { '--ui-box-direction': flexDirection } : {}),
    ...(boxPadding ? { '--ui-box-padding': boxPadding } : {}),
    ...style,
  };

  return (
    <div className={cn('ui-box', className)} style={combinedStyle}>
      {children}
    </div>
  );
};
