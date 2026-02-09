// src/client/ui/src/components/Card.tsx
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
} from 'react';

import { cn } from '../utils/cn';

import '../styles/elements.css';

type CardRootProps = ComponentPropsWithoutRef<'div'> & {
  /** The HTML element or React component to render as */
  as?: ElementType;
};
type CardSectionProps = ComponentPropsWithoutRef<'div'>;

/**
 * A container component for grouping related content with consistent styling.
 *
 * @example
 * ```tsx
 * <Card>
 *   <Card.Header>Title</Card.Header>
 *   <Card.Body>Content</Card.Body>
 * </Card>
 * ```
 */
const CardRoot = forwardRef<HTMLElement, CardRootProps>((props, ref) => {
  const { as = 'div', className, children, ...rest } = props;
  const Component: ElementType = as;
  return (
    <Component ref={ref} className={cn('card', className)} {...rest}>
      {children}
    </Component>
  );
});
CardRoot.displayName = 'Card';

/** Card header section for titles and actions. */
const CardHeader = ({ className, children, ...rest }: CardSectionProps): ReactElement => {
  return (
    <div className={cn('card-header', className)} {...rest}>
      {children}
    </div>
  );
};

/** Card body section for main content. */
const CardBody = ({ className, children, ...rest }: CardSectionProps): ReactElement => {
  return (
    <div className={cn('card-body', className)} {...rest}>
      {children}
    </div>
  );
};

/** Card footer section for actions and metadata. */
const CardFooter = ({ className, children, ...rest }: CardSectionProps): ReactElement => {
  return (
    <div className={cn('card-footer', className)} {...rest}>
      {children}
    </div>
  );
};

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export type { CardRootProps, CardSectionProps };
