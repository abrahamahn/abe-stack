import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import '../primitives/primitives.css';

type PageContainerProps = ComponentPropsWithoutRef<'main'> & {
  maxWidth?: number;
  padding?: string;
  gap?: number | string;
};

export function PageContainer({
  maxWidth = 960,
  padding = 'calc(var(--ui-gap-lg) * 2) var(--ui-gap-xl) calc(var(--ui-gap-xl) + var(--ui-gap-lg))',
  gap = 'var(--ui-gap-lg)',
  style,
  children,
  ...rest
}: PageContainerProps): ReactElement {
  return (
    <main
      style={{
        maxWidth,
        margin: '0 auto',
        padding,
        display: 'grid',
        gap,
        ...style,
      }}
      {...rest}
    >
      {children}
    </main>
  );
}
