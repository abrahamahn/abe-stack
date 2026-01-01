import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
} from 'react';
import '../styles/elements.css';

type HeadingSize = 'xl' | 'lg' | 'md' | 'sm';

type HeadingProps = ComponentPropsWithoutRef<'h2'> & {
  as?: ElementType;
  size?: HeadingSize;
};

export const Heading = forwardRef<HTMLElement, HeadingProps>((props, ref): ReactElement => {
  const { as = 'h2', size = 'lg', className, ...rest } = props;
  const Component: ElementType = as;
  const cls = `ui-heading ${className ?? ''}`.trim();
  return <Component ref={ref} className={cls} data-size={size} {...rest} />;
});

Heading.displayName = 'Heading';
