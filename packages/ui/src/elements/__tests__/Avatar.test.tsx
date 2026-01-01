// packages/ui/src/elements/__tests__/Avatar.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('renders an image when src is provided', () => {
    render(<Avatar src="/avatar.png" alt="User avatar" />);

    const img = screen.getByRole('img', { name: 'User avatar' });
    expect(img).toHaveAttribute('src', '/avatar.png');
  });

  it('renders fallback text when src is missing', () => {
    render(<Avatar fallback="AB" />);

    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('forwards className and ref', () => {
    const ref = { current: null };
    render(<Avatar ref={ref} className="custom-avatar" fallback="CD" data-testid="avatar" />);

    const wrapper = screen.getByTestId('avatar');
    expect(wrapper).toHaveClass('ui-avatar');
    expect(wrapper).toHaveClass('custom-avatar');
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
