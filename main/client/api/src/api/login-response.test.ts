// main/client/api/src/api/login-response.test.ts
import { describe, expect, it } from 'vitest';

import { parseLoginResponse } from './login-response';

const validUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: null,
  role: 'user',
  emailVerified: true,
  phone: null,
  phoneVerified: null,
  dateOfBirth: null,
  gender: null,
  bio: null,
  city: null,
  state: null,
  country: null,
  language: null,
  website: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
} as const;

describe('parseLoginResponse', () => {
  it('parses totp challenge responses', () => {
    const result = parseLoginResponse({
      requiresTotp: true,
      challengeToken: 'challenge-token',
      message: 'TOTP required',
    });
    expect(result).toEqual({
      requiresTotp: true,
      challengeToken: 'challenge-token',
      message: 'TOTP required',
    });
  });

  it('parses sms challenge responses', () => {
    const result = parseLoginResponse({
      requiresSms: true,
      challengeToken: 'challenge-token',
      message: 'SMS required',
    });
    expect(result).toEqual({
      requiresSms: true,
      challengeToken: 'challenge-token',
      message: 'SMS required',
    });
  });

  it('supports cookie-session login shape with only user', () => {
    const result = parseLoginResponse({
      user: {
        ...validUser,
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'legacy@example.com',
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          id: '550e8400-e29b-41d4-a716-446655440001',
          email: 'legacy@example.com',
          username: 'testuser',
          role: 'user',
        }),
      }),
    );
  });

  it('accepts non-canonical user payloads for later hydration', () => {
    expect(() =>
      parseLoginResponse({
        user: { user_id: 12345, username: 'legacyuser' },
      }),
    ).toThrow('Invalid login response shape (keys=user)');
  });

  it('throws with key preview for unknown shapes', () => {
    expect(() => parseLoginResponse({ foo: 'bar' })).toThrow(
      'Invalid login response shape (keys=foo)',
    );
  });
});
