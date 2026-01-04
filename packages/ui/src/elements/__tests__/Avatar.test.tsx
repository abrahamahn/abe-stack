// packages/ui/src/elements/__tests__/Avatar.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('renders fallback when no src provided', () => {
    render(<Avatar fallback="AB" data-testid="avatar" />);

    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveClass('avatar');
    expect(screen.getByText('AB')).toBeInTheDocument();
    expect(avatar.querySelector('img')).not.toBeInTheDocument();
  });

  it('renders image when src provided', () => {
    render(<Avatar src="/avatar.jpg" alt="User" data-testid="avatar" />);

    const avatar = screen.getByTestId('avatar');
    const img = avatar.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/avatar.jpg');
    expect(img).toHaveAttribute('alt', 'User');
  });

  it('merges className and forwards ref', () => {
    const ref = { current: null };
    render(<Avatar ref={ref} fallback="X" className="custom" data-testid="avatar" />);

    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveClass('avatar');
    expect(avatar).toHaveClass('custom');
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
