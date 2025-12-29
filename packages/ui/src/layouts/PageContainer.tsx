import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import '../primitives/primitives.css';

type PageContainerProps = ComponentPropsWithoutRef<'main'> & {
  maxWidth?: number;
  padding?: string;
  gap?: number;
};

export function PageContainer({
  maxWidth = 960,
  padding = '32px 24px 40px',
  gap = 16,
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
