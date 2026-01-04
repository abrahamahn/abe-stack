import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
} from 'react';
import '../styles/elements.css';

type CardRootProps = ComponentPropsWithoutRef<'div'> & {
  as?: ElementType;
};
type CardSectionProps = ComponentPropsWithoutRef<'div'>;

const CardRoot = forwardRef<HTMLElement, CardRootProps>((props, ref) => {
  const { as = 'div', className = '', children, ...rest } = props;
  const Component: ElementType = as;
  return (
    <Component ref={ref} className={`card ${className}`.trim()} {...rest}>
      {children}
    </Component>
  );
});
CardRoot.displayName = 'Card';

function CardHeader({ className = '', children, ...rest }: CardSectionProps): ReactElement {
  return (
    <div className={`card-header ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

function CardBody({ className = '', children, ...rest }: CardSectionProps): ReactElement {
  return (
    <div className={`card-body ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

function CardFooter({ className = '', children, ...rest }: CardSectionProps): ReactElement {
  return (
    <div className={`card-footer ${className}`.trim()} {...rest}>
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
