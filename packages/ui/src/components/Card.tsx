// packages/ui/src/components/Card.tsx
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
} from 'react';

import { cn } from '../utils/cn';

import '../styles/elements.css';

type CardRootProps = ComponentPropsWithoutRef<'div'> & {
  as?: ElementType;
};
type CardSectionProps = ComponentPropsWithoutRef<'div'>;

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

function CardHeader({ className, children, ...rest }: CardSectionProps): ReactElement {
  return (
    <div className={cn('card-header', className)} {...rest}>
      {children}
    </div>
  );
}

function CardBody({ className, children, ...rest }: CardSectionProps): ReactElement {
  return (
    <div className={cn('card-body', className)} {...rest}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...rest }: CardSectionProps): ReactElement {
  return (
    <div className={cn('card-footer', className)} {...rest}>
      {children}
    </div>
  );
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export type { CardRootProps, CardSectionProps };
