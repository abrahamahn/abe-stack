// main/server/core/src/auth/handlers/sudo.test.ts
import { SUDO_TOKEN_HEADER } from '@bslt/shared';
import { describe, expect, it } from 'vitest';

import { sign } from '../../../../engine/src';

import { SUDO_TOKEN_TTL_MINUTES, verifySudoToken } from './sudo';

const TEST_SECRET = 'a-very-long-secret-that-is-at-least-32-chars!!';

describe('verifySudoToken', () => {
  it('returns userId for a valid sudo token', () => {
    const token = sign({ userId: 'u-1', type: 'sudo' }, TEST_SECRET, { expiresIn: '5m' });
    const result = verifySudoToken(token, TEST_SECRET);
    expect(result).toEqual({ userId: 'u-1' });
  });

  it('returns null for a token with wrong type', () => {
    const token = sign({ userId: 'u-1', type: 'access' }, TEST_SECRET, { expiresIn: '5m' });
    expect(verifySudoToken(token, TEST_SECRET)).toBeNull();
  });

  it('returns null for an expired token', () => {
    const token = sign({ userId: 'u-1', type: 'sudo' }, TEST_SECRET, { expiresIn: '0s' });
    expect(verifySudoToken(token, TEST_SECRET)).toBeNull();
  });

  it('returns null for a token signed with wrong secret', () => {
    const token = sign({ userId: 'u-1', type: 'sudo' }, TEST_SECRET, { expiresIn: '5m' });
    expect(verifySudoToken(token, 'wrong-secret-that-is-also-32-chars!!')).toBeNull();
  });

  it('returns null for an invalid token string', () => {
    expect(verifySudoToken('not-a-jwt', TEST_SECRET)).toBeNull();
  });

  it('returns null for a token without userId', () => {
    const token = sign({ type: 'sudo' }, TEST_SECRET, { expiresIn: '5m' });
    expect(verifySudoToken(token, TEST_SECRET)).toBeNull();
  });
});

describe('sudo constants', () => {
  it('SUDO_TOKEN_HEADER is x-sudo-token', () => {
    expect(SUDO_TOKEN_HEADER).toBe('x-sudo-token');
  });

  it('SUDO_TOKEN_TTL_MINUTES is 5', () => {
    expect(SUDO_TOKEN_TTL_MINUTES).toBe(5);
  });
});
