import React from 'react';
import type { BoxProps } from './types';

export const Box = ({ children, style, className, padding, flexDirection }: BoxProps) => {
  const combinedStyle: React.CSSProperties = {
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
