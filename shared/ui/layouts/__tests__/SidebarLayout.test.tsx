// packages/ui/src/layouts/__tests__/SidebarLayout.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SidebarLayout } from '../SidebarLayout';

describe('SidebarLayout', () => {
  it('renders sidebar and main content', () => {
    render(
      <SidebarLayout sidebar={<div>Nav</div>}>
        <div>Main</div>
      </SidebarLayout>,
    );

    expect(screen.getByText('Nav')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
  });

  it('renders header when provided', () => {
    render(
      <SidebarLayout sidebar={<div>Nav</div>} header={<div>Header</div>}>
        <div>Body</div>
      </SidebarLayout>,
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(
      <SidebarLayout sidebar={<div>Nav</div>} className="custom-layout">
        <div>Body</div>
      </SidebarLayout>,
    );

    const root = screen.getByText('Body').closest('.ui-sidebar-layout');
    expect(root).toHaveClass('custom-layout');
  });

  it('handles null header without crashing', () => {
    expect(() => {
      render(
        <SidebarLayout sidebar={<div>Nav</div>} header={null}>
          <div>Body</div>
        </SidebarLayout>,
      );
    }).not.toThrow();
  });
});
