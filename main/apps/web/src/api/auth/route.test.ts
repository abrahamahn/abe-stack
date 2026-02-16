// main/apps/web/src/api/auth/route.test.ts
import { describe, expect, it, vi } from 'vitest';

import { createAuthRoute } from './route';

describe('createAuthRoute', () => {
  it('forwards calls to the api client', async () => {
    const api = {
      login: vi.fn().mockResolvedValue({ token: 'a' }),
      totpVerifyLogin: vi.fn().mockResolvedValue({ token: 'b' }),
      register: vi.fn().mockResolvedValue({ message: 'ok' }),
      logout: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn().mockResolvedValue(undefined),
      getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }),
      forgotPassword: vi.fn().mockResolvedValue({ message: 'sent' }),
      resetPassword: vi.fn().mockResolvedValue({ message: 'done' }),
      verifyEmail: vi.fn().mockResolvedValue({ verified: true }),
      resendVerification: vi.fn().mockResolvedValue({ message: 'resent' }),
    };

    const route = createAuthRoute(api as never);

    await route.login({ email: 'user@example.com', password: 'pw' } as never);
    await route.totpVerifyLogin({ challengeToken: 'challenge', code: '123456' });
    await route.register({ email: 'user@example.com', password: 'pw' } as never);
    await route.logout();
    await route.refresh();
    await route.getCurrentUser();
    await route.forgotPassword({ email: 'user@example.com' } as never);
    await route.resetPassword({ token: 'token', password: 'next' } as never);
    await route.verifyEmail({ token: 'token' } as never);
    await route.resendVerification({ email: 'user@example.com' } as never);

    expect(api.login).toHaveBeenCalledWith({ email: 'user@example.com', password: 'pw' });
    expect(api.totpVerifyLogin).toHaveBeenCalledWith({
      challengeToken: 'challenge',
      code: '123456',
    });
    expect(api.register).toHaveBeenCalledWith({ email: 'user@example.com', password: 'pw' });
    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(api.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(api.forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(api.resetPassword).toHaveBeenCalledWith({ token: 'token', password: 'next' });
    expect(api.verifyEmail).toHaveBeenCalledWith({ token: 'token' });
    expect(api.resendVerification).toHaveBeenCalledWith({ email: 'user@example.com' });
  });
});
