import { forwardRef, type ComponentPropsWithoutRef, type ReactElement } from 'react';
import './primitives.css';

type CardRootProps = ComponentPropsWithoutRef<'div'>;
type CardSectionProps = ComponentPropsWithoutRef<'div'>;

const CardRoot = forwardRef<HTMLDivElement, CardRootProps>((props, ref) => {
  const { className = '', children, ...rest } = props;
  return (
    <div ref={ref} className={`ui-card ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
});
CardRoot.displayName = 'CardPrimitive.Root';

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

export const CardPrimitive = {
  Root: CardRoot,
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
};
