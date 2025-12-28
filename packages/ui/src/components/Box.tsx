import type { ReactNode, CSSProperties, ReactElement } from 'react';

export interface BoxProps {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  padding?: number | string;
  flexDirection?: 'row' | 'column';
}

export const Box = ({
  children,
  style,
  className,
  padding,
  flexDirection,
}: BoxProps): ReactElement => {
  const combinedStyle: CSSProperties = {
    display: 'flex',
    flexDirection: flexDirection || 'column',
    padding,
    ...style,
  };

  return (
    <div className={className} style={combinedStyle}>
      {children}
    </div>
  );
};
