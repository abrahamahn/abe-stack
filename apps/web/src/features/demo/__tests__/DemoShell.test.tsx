// apps/web/src/features/demo/__tests__/DemoShell.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DemoShell } from '../DemoShell';

vi.mock('../registry', () => ({
  getAllCategories: (): string[] => ['elements'],
  getComponentsByCategory: (): unknown[] => [],
}));

vi.mock('../docs', () => ({
  getComponentDocs: (): null => null,
  parseMarkdown: (markdown: string): string => markdown,
}));

describe('DemoShell layout controls', () => {
  const renderDemoShell = (): void => {
    render(
      <MemoryRouter>
        <DemoShell />
      </MemoryRouter>,
    );
  };

  it('renders layout toggle buttons in the sidebar', () => {
    renderDemoShell();

    expect(screen.getByRole('button', { name: /toggle top bar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle left panel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle right panel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle bottom bar/i })).toBeInTheDocument();
  });

  it('collapses the bottom panel when toggled', () => {
    renderDemoShell();

    const bottomPanel = screen.getByTestId('demo-bottom-panel');
    expect(bottomPanel).toHaveStyle({ flexBasis: '15%' });

    fireEvent.click(screen.getByRole('button', { name: /toggle bottom bar/i }));
    expect(bottomPanel).toHaveStyle({ flexBasis: '0%' });
  });
});
