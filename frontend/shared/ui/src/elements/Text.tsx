// packages/ui/src/elements/Text.tsx
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
} from 'react';
import '../styles/elements.css';

type Tone = 'default' | 'muted' | 'danger' | 'success';

type TextProps = ComponentPropsWithoutRef<'p'> & {
  as?: ElementType;
  tone?: Tone;
};

export const Text = forwardRef<HTMLElement, TextProps>((props, ref): ReactElement => {
  const { as, tone = 'default', className, ...rest } = props;
  const Component: ElementType = as ?? 'p';
  const cls = `text ${className ?? ''}`.trim();
  return <Component ref={ref} className={cls} data-tone={tone} {...rest} />;
});

Text.displayName = 'Text';
