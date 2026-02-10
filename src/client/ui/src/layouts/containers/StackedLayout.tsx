// src/client/ui/src/layouts/containers/StackedLayout.tsx
import { Container } from '@containers/Container';
import '../../styles/layouts.css';

import type { ReactElement, ReactNode } from 'react';

type StackedLayoutProps = {
  /** Optional hero section rendered above the main body content */
  hero?: ReactNode;
  /** Main body content */
  children: ReactNode;
};

/**
 * A vertically stacked layout with an optional hero section and a body area,
 * wrapped in a medium-width container. Useful for landing pages or content-focused views.
 *
 * @example
 * ```tsx
 * <StackedLayout hero={<HeroBanner />}>
 *   <ContentSection />
 * </StackedLayout>
 * ```
 */
export const StackedLayout = ({ hero, children }: StackedLayoutProps): ReactElement => {
  return (
    <div className="stacked-layout">
      <Container size="md">
        {hero !== undefined && hero !== null ? (
          <div className="stacked-layout-hero">{hero}</div>
        ) : null}
        <div className="stacked-layout-body">{children}</div>
      </Container>
    </div>
  );
};
