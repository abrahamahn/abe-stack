// src/apps/web/src/features/home/HomePage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomePage } from './HomePage';

vi.mock('./components', () => ({
  ['HomeDocViewer']: (): React.ReactElement => <div data-testid="home-doc-viewer">DocViewer</div>,
}));

vi.mock('./hooks', () => ({
  useDocContent: () => ({ content: '# README', isLoading: false }),
}));

describe('HomePage', () => {
  it('renders home doc viewer content', () => {
    render(<HomePage />);
    expect(screen.getByTestId('home-doc-viewer')).toBeInTheDocument();
  });
});
