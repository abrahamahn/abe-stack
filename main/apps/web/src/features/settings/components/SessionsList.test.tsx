// main/apps/web/src/features/settings/components/SessionsList.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock fn references so they are available when vi.mock factories execute
const { mockSessionCardFn, mockAlertFn, mockButtonFn, mockSkeletonFn } = vi.hoisted(() => ({
  mockSessionCardFn: vi.fn(),
  mockAlertFn: vi.fn(),
  mockButtonFn: vi.fn(),
  mockSkeletonFn: vi.fn(),
}));

vi.mock('../hooks', () => ({
  useSessions: vi.fn(),
  useRevokeSession: vi.fn(),
  useRevokeAllSessions: vi.fn(),
}));

vi.mock('./SessionCard', () => ({
  ['SessionCard']: (props: { session: { id: string; device: string }; onRevoke: () => void }) => {
    mockSessionCardFn(props);
    return (
      <div data-testid={`session-card-${props.session.id}`}>
        <span>{props.session.device}</span>
        <button onClick={props.onRevoke}>Revoke</button>
      </div>
    );
  },
}));

vi.mock('@abe-stack/ui', () => ({
  ['Alert']: (props: { children?: ReactNode; tone?: string }) => {
    mockAlertFn(props);
    return (
      <div data-testid="alert" data-tone={props.tone}>
        {props.children}
      </div>
    );
  },
  ['Button']: (props: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => {
    mockButtonFn(props);
    return (
      <button data-testid="revoke-all-button" onClick={props.onClick} disabled={props.disabled}>
        {props.children}
      </button>
    );
  },
  ['Skeleton']: (props: Record<string, unknown>) => {
    mockSkeletonFn(props);
    return <div data-testid="skeleton" />;
  },
  ['Heading']: (props: { children?: ReactNode; as?: string; className?: string }) => {
    return createElement(props.as ?? 'h2', { className: props.className }, props.children);
  },
  ['Text']: (props: { children?: ReactNode; tone?: string; size?: string; className?: string }) => (
    <span data-tone={props.tone} className={props.className}>
      {props.children}
    </span>
  ),
}));

import { useRevokeAllSessions, useRevokeSession, useSessions } from '../hooks';

import { SessionsList } from './SessionsList';

import type { Session } from '../api';
import type { ReactNode } from 'react';

describe('SessionsList', () => {
  let mockRefetch: any;
  let mockRevokeSession: any;
  let mockRevokeAllSessions: any;

  const mockSessions: Session[] = [
    {
      id: 'session-1',
      device: 'Chrome on Windows',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      isCurrent: true,
    },
    {
      id: 'session-2',
      device: 'Firefox on macOS',
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
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
      isFetching: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    vi.mocked(useRevokeSession).mockReturnValue({
      revokeSession: mockRevokeSession,
      isLoading: false,
      isFetching: false,
      isSuccess: false,
      isError: false,
      error: null,
      reset: vi.fn() as any,
    } as any);

    vi.mocked(useRevokeAllSessions).mockReturnValue({
      revokeAllSessions: mockRevokeAllSessions,
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      revokedCount: null,
      reset: vi.fn(),
    } as any);
  });

  describe('loading state', () => {
    it('should show skeleton loaders when loading', () => {
      vi.mocked(useSessions).mockReturnValue({
        sessions: [],
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(<SessionsList />);
      expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
    });
  });

  describe('error state', () => {
    it('should show error message when loading fails', () => {
      vi.mocked(useSessions).mockReturnValue({
        sessions: [],
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as any);

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
        sessions: [mockSessions[0] as Session],
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as any);

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
      let capturedOnSuccess: ((response: any) => void) | undefined;
      vi.mocked(useRevokeSession).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          revokeSession: mockRevokeSession,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: vi.fn() as any,
        } as any;
      });

      render(<SessionsList />);

      // Simulate successful revoke by calling the captured callback
      expect(capturedOnSuccess).toBeDefined();
      capturedOnSuccess?.({ success: true });
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
        sessions: [mockSessions[0] as Session],
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(<SessionsList />);
      expect(screen.queryByTestId('revoke-all-button')).not.toBeInTheDocument();
    });

    it('should show success message after revoking all', () => {
      vi.mocked(useRevokeAllSessions).mockReturnValue({
        revokeAllSessions: mockRevokeAllSessions,
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        error: null,
        revokedCount: 2,
        reset: vi.fn() as any,
      } as any);

      render(<SessionsList />);
      expect(screen.getByText(/Successfully logged out from 2 devices/)).toBeInTheDocument();
    });
  });
});
