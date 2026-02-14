// main/client/ui/src/components/TitledCardSection.tsx
import { Heading } from '../elements/Heading';
import { cn } from '../utils/cn';

import { Card } from './Card';

import type { ReactElement, ReactNode } from 'react';

type HeadingAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type HeadingSize = 'sm' | 'md' | 'lg' | 'xl';

export interface TitledCardSectionProps {
  title: string;
  children: ReactNode;
  headingAs?: HeadingAs;
  headingSize?: HeadingSize;
  cardClassName?: string;
  headingClassName?: string;
}

export const TitledCardSection = ({
  title,
  children,
  headingAs = 'h3',
  headingSize = 'md',
  cardClassName = 'p-4',
  headingClassName = 'mb-4',
}: TitledCardSectionProps): ReactElement => {
  return (
    <Card className={cardClassName}>
      <Heading as={headingAs} size={headingSize} className={cn(headingClassName)}>
        {title}
      </Heading>
      {children}
    </Card>
  );
};
