import { cn } from '../utils/cn';

import '../styles/layouts.css';
import type { CSSProperties, ComponentPropsWithoutRef, ReactElement } from 'react';

type PageContainerProps = ComponentPropsWithoutRef<'main'> & {
  maxWidth?: number;
  padding?: string;
  gap?: number | string;
};

export function PageContainer({
  maxWidth,
  padding,
  gap,
  style,
  className,
  children,
  ...rest
}: PageContainerProps): ReactElement {
  const cssVars: CSSProperties = {
    ...(typeof maxWidth !== 'undefined' ? { '--ui-page-max-width': `${String(maxWidth)}px` } : {}),
    ...(typeof padding !== 'undefined' ? { '--ui-page-padding': padding } : {}),
    ...(typeof gap !== 'undefined'
      ? { '--ui-page-gap': typeof gap === 'number' ? `${String(gap)}px` : gap }
      : {}),
    ...style,
  };

  return (
    <main className={cn('ui-page-container', className)} style={cssVars} {...rest}>
      {children}
    </main>
  );
}
