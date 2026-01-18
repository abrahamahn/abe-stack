// packages/ui/src/elements/Text.tsx
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
} from 'react';
import '../styles/elements.css';

type Tone = 'default' | 'muted' | 'danger' | 'success';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type TextProps = ComponentPropsWithoutRef<'p'> & {
  as?: ElementType;
  tone?: Tone;
  size?: Size;
};

export const Text = forwardRef<HTMLElement, TextProps>((props, ref): ReactElement => {
  const { as, tone = 'default', size, className, ...rest } = props;
  const Component: ElementType = as ?? 'p';
  const sizeClass = size ? `text-${size}` : '';
  const cls = `text ${sizeClass} ${className ?? ''}`.trim();
  return <Component ref={ref} className={cls} data-tone={tone} {...rest} />;
});

Text.displayName = 'Text';
