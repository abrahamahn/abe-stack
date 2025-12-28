import type { ReactNode } from 'react';
import './page-content.css';

interface PageContentProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function PageContent({ children, title, description }: PageContentProps) {
  return (
    <div className="page-content">
      {title && <h1 className="page-title">{title}</h1>}
      {description && <p className="page-description">{description}</p>}
      <div className={`page-content-body ${!title && !description ? 'no-header' : ''}`}>
        {children}
      </div>
    </div>
  );
}
