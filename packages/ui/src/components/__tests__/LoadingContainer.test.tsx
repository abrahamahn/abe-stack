/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingContainer } from '../LoadingContainer';

describe('LoadingContainer', () => {
  it('renders with default text', () => {
    render(<LoadingContainer />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<LoadingContainer text="Fetching data..." />);
    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('renders spinner', () => {
    render(<LoadingContainer />);
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  it('applies className', () => {
    render(<LoadingContainer className="custom-loading" />);
    const container = document.querySelector('.loading-container');
    expect(container).toHaveClass('custom-loading');
  });

  it('passes through additional props', () => {
    render(<LoadingContainer data-testid="loading" style={{ minHeight: 200 }} />);
    const container = screen.getByTestId('loading');
    expect(container).toHaveStyle({ minHeight: '200px' });
  });
});
