// src/apps/web/src/app/layouts/AppRightInfo.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppRightInfo } from './AppRightInfo';

const mockPathname = vi.hoisted(() => ({ current: '/dashboard' }));

vi.mock('@abe-stack/react/router', () => ({
  useLocation: () => ({ pathname: mockPathname.current }),
}));

describe('AppRightInfo', () => {
  it('renders route information for current pathname', () => {
    mockPathname.current = '/settings/accounts';
    render(<AppRightInfo />);

    expect(screen.getByText('Current Route')).toBeInTheDocument();
    expect(screen.getByText('/settings/accounts')).toBeInTheDocument();
  });
});
