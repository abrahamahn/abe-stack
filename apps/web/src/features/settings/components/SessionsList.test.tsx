// apps/web/src/features/settings/components/SessionsList.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { SessionsList } from './SessionsList';

import type { Session } from '../api';

vi.mock('../hooks', () => ({
  useSessions: vi.fn(),
  useRevokeSession: vi.fn(),
  useRevokeAllSessions: vi.fn(),
}));

vi.mock('./SessionCard', () => ({
  SessionCard: ({ session, onRevoke }: { session: Session; onRevoke: () => void }) => (
    <div data-testid={`session-card-${session.id}`}>
      <span>{session.device}</span>
      <button onClick={onRevoke}>Revoke</button>
    </div>
  ),
}));

vi.mock('@abe-stack/ui', () => ({
  Alert: ({ children, tone }: { children: React.ReactNode; tone: string }) => (
    <div data-testid="alert" data-tone={tone}>{children}</div>
  ),
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button data-testid="revoke-all-button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Skeleton: () => <div data-testid="skeleton" />,
}));

import { useSessions, useRevokeSession, useRevokeAllSessions } from '../hooks';

describe('SessionsList', () => {
  let mockRefetch: ReturnType<typeof vi.fn>;
  let mockRevokeSession: ReturnType<typeof vi.fn>;
  let mockRevokeAllSessions: ReturnType<typeof vi.fn>;

  const mockSessions: Session[] = [
    {
      id: 'session-1',
      userId: 'user-123',
      device: 'Chrome on Windows',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isCurrent: true,
    },
    {
      id: 'session-2',
      userId: 'user-123',
      device: 'Firefox on macOS',
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isCurrent: false,
    },
  ];

  beforeEach(() => {
    mockRefetch = vi.fn();
    mockRevokeSession = vi.fn();
    mockRevokeAllSessions = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    vi.mocked(useSessions).mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    vi.mocked(useRevokeSession).mockReturnValue({
      revokeSession: mockRevokeSession,
      isLoading: false,
      error: null,
    });

    vi.mocked(useRevokeAllSessions).mockReturnValue({
      revokeAllSessions: mockRevokeAllSessions,
      isLoading: false,
      error: null,
      revokedCount: null,
    });
  });

  describe('loading state', () => {
    it('should show skeleton loaders when loading', () => {
      vi.mocked(useSessions).mockReturnValue({
        sessions: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<SessionsList />);
      expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
    });
  });

  describe('error state', () => {
    it('should show error message when loading fails', () => {
      vi.mocked(useSessions).mockReturnValue({
        sessions: [],
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      render(<SessionsList />);
      expect(screen.getByText(/Failed to load sessions/)).toBeInTheDocument();
    });
  });

  describe('sessions display', () => {
    it('should render current session', () => {
      render(<SessionsList />);
      expect(screen.getByTestId('session-card-session-1')).toBeInTheDocument();
    });

    it('should render other sessions', () => {
      render(<SessionsList />);
      expect(screen.getByTestId('session-card-session-2')).toBeInTheDocument();
    });

    it('should show "Log out from all" button when other sessions exist', () => {
      render(<SessionsList />);
      expect(screen.getByTestId('revoke-all-button')).toBeInTheDocument();
    });

    it('should show message when only one session', () => {
      vi.mocked(useSessions).mockReturnValue({
        sessions: [mockSessions[0]],
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<SessionsList />);
      expect(screen.getByText('This is your only active session.')).toBeInTheDocument();
    });
  });

  describe('revoke single session', () => {
    it('should call revokeSession when confirmed', () => {
      render(<SessionsList />);
      fireEvent.click(screen.getByTestId('session-card-session-2').querySelector('button')!);
      expect(mockRevokeSession).toHaveBeenCalledWith('session-2');
    });

    it('should not revoke when cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<SessionsList />);
      fireEvent.click(screen.getByTestId('session-card-session-2').querySelector('button')!);
      expect(mockRevokeSession).not.toHaveBeenCalled();
    });

    it('should refetch after successful revoke', () => {
      // Capture the onSuccess callback passed to the hook
      let capturedOnSuccess: (() => void) | undefined;
      vi.mocked(useRevokeSession).mockImplementation(({ onSuccess }) => {
        capturedOnSuccess = onSuccess;
        return { revokeSession: mockRevokeSession, isLoading: false, error: null };
      });

      render(<SessionsList />);

      // Simulate successful revoke by calling the captured callback
      expect(capturedOnSuccess).toBeDefined();
      capturedOnSuccess?.();
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('revoke all sessions', () => {
    it('should call revokeAllSessions when confirmed', () => {
      render(<SessionsList />);
      fireEvent.click(screen.getByTestId('revoke-all-button'));
      expect(mockRevokeAllSessions).toHaveBeenCalled();
    });

    it('should not revoke all when cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<SessionsList />);
      fireEvent.click(screen.getByTestId('revoke-all-button'));
      expect(mockRevokeAllSessions).not.toHaveBeenCalled();
    });

    it('should not allow revoking when no other sessions', () => {
      vi.mocked(useSessions).mockReturnValue({
        sessions: [mockSessions[0]],
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<SessionsList />);
      expect(screen.queryByTestId('revoke-all-button')).not.toBeInTheDocument();
    });

    it('should show success message after revoking all', () => {
      vi.mocked(useRevokeAllSessions).mockReturnValue({
        revokeAllSessions: mockRevokeAllSessions,
        isLoading: false,
        error: null,
        revokedCount: 2,
      });

      render(<SessionsList />);
      expect(screen.getByText(/Successfully logged out from 2 devices/)).toBeInTheDocument();
    });
  });
});
