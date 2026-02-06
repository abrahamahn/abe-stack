// apps/web/src/features/settings/pages/SettingsPage.test.tsx
import { useQuery } from '@abe-stack/client-engine';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsPage } from './SettingsPage';

import type { User } from '../api';
import type { ReactNode } from 'react';

vi.mock('@abe-stack/client-engine', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../components', () => {
  const mockAvatarUpload = () => <div data-testid="avatar-upload">Avatar Upload</div>;
  const mockOAuthConnectionsList = () => (
    <div data-testid="oauth-connections">OAuth Connections</div>
  );
  const mockPasswordChangeForm = () => <div data-testid="password-form">Password Form</div>;
  const mockProfileForm = () => <div data-testid="profile-form">Profile Form</div>;
  const mockSessionsList = () => <div data-testid="sessions-list">Sessions List</div>;

  return {
    AvatarUpload: mockAvatarUpload,
    OAuthConnectionsList: mockOAuthConnectionsList,
    PasswordChangeForm: mockPasswordChangeForm,
    ProfileForm: mockProfileForm,
    SessionsList: mockSessionsList,
  };
});

vi.mock('@abe-stack/ui', () => {
  const mockButton = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  );

  const mockCard = ({ children }: { children: ReactNode }) => <div>{children}</div>;

  const mockContainer = ({ children }: { children: ReactNode }) => <div>{children}</div>;

  const mockHeading = ({ children }: { children: ReactNode }) => <h1>{children}</h1>;

  const mockTabs = ({
    items,
  }: {
    items: Array<{ id: string; label: string; content: ReactNode }>;
  }) => (
    <div data-testid="tabs">
      {items.map((item) => (
        <div key={item.id} data-testid={`tab-${item.id}`}>
          {item.label}
          {item.content}
        </div>
      ))}
    </div>
  );

  return {
    Button: mockButton,
    Card: mockCard,
    Container: mockContainer,
    Heading: mockHeading,
    Tabs: mockTabs,
  };
});

describe('SettingsPage', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    role: 'user',
    isVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    Storage.prototype.getItem = vi.fn(() => 'mock-token');
  });

  describe('loading state', () => {
    it('should show loading skeleton', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        status: 'pending',
        error: null,
        refetch: vi.fn(),
        isLoading: true,
        isFetching: true,
        isError: false,
        isSuccess: false,
      } as any);

      const { container } = render(<SettingsPage />);
      // The component shows a skeleton loader with animate-pulse class
      const loadingElement = container.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        status: 'error',
        error: new Error('Failed to load'),
        refetch: vi.fn(),
        isLoading: false,
        isFetching: false,
        isError: true,
        isSuccess: false,
      } as any);

      render(<SettingsPage />);
      expect(screen.getByText(/Unable to Load Settings/)).toBeInTheDocument();
    });

    it('should allow retry', () => {
      const mockRefetch = vi.fn();
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        status: 'error',
        error: new Error('Failed'),
        refetch: mockRefetch,
        isLoading: false,
        isFetching: false,
        isError: true,
        isSuccess: false,
      } as any);

      render(<SettingsPage />);
      fireEvent.click(screen.getByText('Try Again'));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('success state', () => {
    beforeEach(() => {
      vi.mocked(useQuery).mockReturnValue({
        data: mockUser,
        status: 'success',
        error: null,
        refetch: vi.fn(),
        isLoading: false,
        isFetching: false,
        isError: false,
        isSuccess: true,
      } as any);
    });

    it('should render all tabs', () => {
      render(<SettingsPage />);
      expect(screen.getByTestId('tab-profile')).toBeInTheDocument();
      expect(screen.getByTestId('tab-security')).toBeInTheDocument();
      expect(screen.getByTestId('tab-sessions')).toBeInTheDocument();
      expect(screen.getByTestId('tab-billing')).toBeInTheDocument();
    });

    it('should render profile tab content', () => {
      render(<SettingsPage />);
      expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
      expect(screen.getByTestId('profile-form')).toBeInTheDocument();
    });

    it('should render security tab content', () => {
      render(<SettingsPage />);
      expect(screen.getByTestId('password-form')).toBeInTheDocument();
      expect(screen.getByTestId('oauth-connections')).toBeInTheDocument();
    });

    it('should render sessions tab content', () => {
      render(<SettingsPage />);
      expect(screen.getByTestId('sessions-list')).toBeInTheDocument();
    });

    it('should render billing tab with link', () => {
      render(<SettingsPage />);
      expect(screen.getByText(/Billing page/)).toBeInTheDocument();
    });
  });
});
