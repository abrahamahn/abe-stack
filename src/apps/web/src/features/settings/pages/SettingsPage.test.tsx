// src/apps/web/src/features/settings/pages/SettingsPage.test.tsx
import { useAuth } from '@auth/hooks';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsPage } from './SettingsPage';

import type { User } from '../api';
import type { UserId } from '@abe-stack/shared';
import type { ReactNode } from 'react';

vi.mock('@auth/hooks', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../components', () => {
  const mockAvatarUpload = () => <div data-testid="avatar-upload">Avatar Upload</div>;
  const mockEmailChangeForm = () => <div data-testid="email-change-form">Email Change Form</div>;
  const mockForgotPasswordShortcut = () => (
    <div data-testid="forgot-password-shortcut">Forgot Password Shortcut</div>
  );
  const mockOAuthConnectionsList = () => (
    <div data-testid="oauth-connections">OAuth Connections</div>
  );
  const mockPasswordChangeForm = () => <div data-testid="password-form">Password Form</div>;
  const mockProfileForm = () => <div data-testid="profile-form">Profile Form</div>;
  const mockSessionsList = () => <div data-testid="sessions-list">Sessions List</div>;
  const mockTotpManagement = () => <div data-testid="totp-management">TOTP Management</div>;

  return {
    AvatarUpload: mockAvatarUpload,
    EmailChangeForm: mockEmailChangeForm,
    ForgotPasswordShortcut: mockForgotPasswordShortcut,
    OAuthConnectionsList: mockOAuthConnectionsList,
    PasswordChangeForm: mockPasswordChangeForm,
    ProfileForm: mockProfileForm,
    SessionsList: mockSessionsList,
    TotpManagement: mockTotpManagement,
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
    id: 'user-123' as unknown as UserId,
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: 'https://example.com/avatar.jpg',
    role: 'user',
    emailVerified: true,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    Storage.prototype.getItem = vi.fn(() => 'mock-token');
  });

  describe('loading state', () => {
    it('should show loading skeleton', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        logout: vi.fn(),
      } as any);

      const { container } = render(<SettingsPage />);
      // The component shows a skeleton loader with animate-pulse class
      const loadingElement = container.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        logout: vi.fn(),
      } as any);

      render(<SettingsPage />);
      expect(screen.getByText(/Unable to Load Settings/)).toBeInTheDocument();
    });

    it('should allow retry', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        logout: vi.fn(),
      } as any);

      render(<SettingsPage />);
      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
      fireEvent.click(retryButton);
    });
  });

  describe('success state', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
        logout: vi.fn(),
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
      expect(screen.getByTestId('totp-management')).toBeInTheDocument();
      expect(screen.getByTestId('password-form')).toBeInTheDocument();
      expect(screen.getByTestId('forgot-password-shortcut')).toBeInTheDocument();
      expect(screen.getByTestId('email-change-form')).toBeInTheDocument();
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
