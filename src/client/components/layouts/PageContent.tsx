import React, { ReactNode } from 'react';

interface PageContentProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function PageContent({ children, title, description }: PageContentProps) {
  return (
    <div style={{ padding: '20px' }}>
      {title && <h1>{title}</h1>}
      {description && <p>{description}</p>}
      <div style={{ marginTop: title || description ? '20px' : '0' }}>
        {children}
      </div>
    </div>
  );
} 