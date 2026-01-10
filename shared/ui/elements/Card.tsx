import '../styles/components.css';

import type { FC, HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
};

export const Card: FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
