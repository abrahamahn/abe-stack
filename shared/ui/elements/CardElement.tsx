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
    <Component ref={ref} className={`ui-card ${className}`.trim()} {...rest}>
      {children}
    </Component>
  );
});
CardRoot.displayName = 'CardElement.Root';

function CardHeader({ children, ...rest }: CardSectionProps): ReactElement {
  return (
    <div className="ui-card-header" {...rest}>
      {children}
    </div>
  );
}

function CardBody({ children, ...rest }: CardSectionProps): ReactElement {
  return (
    <div className="ui-card-body" {...rest}>
      {children}
    </div>
  );
}

function CardFooter({ children, ...rest }: CardSectionProps): ReactElement {
  return (
    <div className="ui-card-footer" {...rest}>
      {children}
    </div>
  );
}

export const CardElement = {
  Root: CardRoot,
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
};
