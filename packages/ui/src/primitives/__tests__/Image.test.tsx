import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { Image } from '../Image';

describe('Image', () => {
  it('renders image with src and alt', () => {
    render(<Image src="/test.jpg" alt="Test Image" />);
    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveAttribute('src', '/test.jpg');
    expect(img).toHaveAttribute('alt', 'Test Image');
  });

  it('shows fallback when loading (if isLoading is true initially)', () => {
    // Note: The component implementation starts with isLoading=true
    render(
      <Image src="/test.jpg" alt="Test" fallback={<div data-testid="fallback">Loading...</div>} />,
    );
    expect(screen.getByTestId('fallback')).toBeInTheDocument();

    // Image should be hidden while loading
    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveStyle({ display: 'none' });
  });

  it('hides fallback and shows image on load', () => {
    render(
      <Image src="/test.jpg" alt="Test" fallback={<div data-testid="fallback">Loading...</div>} />,
    );

    const img = screen.getByRole('img', { hidden: true });
    fireEvent.load(img);

    expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
    expect(img).toHaveStyle({ display: 'block' });
  });

  it('shows fallback on error', () => {
    render(
      <Image src="/invalid.jpg" alt="Test" fallback={<div data-testid="fallback">Error</div>} />,
    );

    const img = screen.getByRole('img', { hidden: true });
    fireEvent.error(img);

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(img).toHaveStyle({ display: 'none' });
  });

  it('applies aspectRatio style', () => {
    const { container } = render(<Image src="/test.jpg" alt="Test" aspectRatio="16/9" />);
    // The style is applied to the wrapper div
    expect(container.firstChild).toHaveStyle({ aspectRatio: '16/9' });
  });

  it('applies objectFit style', () => {
    render(<Image src="/test.jpg" alt="Test" objectFit="contain" />);
    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveStyle({ objectFit: 'contain' });
  });
});
