// src/client/ui/src/layouts/containers/PageContainer.tsx
import { cn } from '@utils/cn';

import '../../styles/layouts.css';
import type { CSSProperties, ComponentPropsWithoutRef, ReactElement } from 'react';

type PageContainerProps = ComponentPropsWithoutRef<'main'> & {
  /** Maximum width in pixels for the page content area */
  maxWidth?: number;
  /** CSS padding value (e.g., '1rem', '16px 24px') */
  padding?: string;
  /** Vertical gap between child elements, as pixels (number) or CSS value (string) */
  gap?: number | string;
};

/**
 * A semantic `<main>` container for page-level content with configurable
 * max-width, padding, and gap via CSS custom properties.
 *
 * @example
 * ```tsx
 * <PageContainer maxWidth={960} padding="2rem" gap={24}>
 *   <PageHeader />
 *   <PageBody />
 * </PageContainer>
 * ```
 */
export const PageContainer = ({
  maxWidth,
  padding,
  gap,
  style,
  className,
  children,
  ...rest
}: PageContainerProps): ReactElement => {
  const cssVars: CSSProperties = {
    ...(typeof maxWidth !== 'undefined'
      ? { ['--ui-page-max-width']: `${String(maxWidth)}px` }
      : {}),
    ...(typeof padding !== 'undefined' ? { ['--ui-page-padding']: padding } : {}),
    ...(typeof gap !== 'undefined'
      ? { ['--ui-page-gap']: typeof gap === 'number' ? `${String(gap)}px` : gap }
      : {}),
    ...style,
  };

  return (
    <main className={cn('page-container', className)} style={cssVars} {...rest}>
      {children}
    </main>
  );
};
