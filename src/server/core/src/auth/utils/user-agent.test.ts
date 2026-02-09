// src/server/core/src/auth/utils/user-agent.test.ts
/**
 * Tests for user-agent parsing utilities.
 */

import { describe, expect, it } from 'vitest';

import { parseUserAgentDeviceInfo } from './user-agent';

describe('parseUserAgentDeviceInfo', () => {
  it('returns null fields for empty user agent', () => {
    expect(parseUserAgentDeviceInfo('')).toEqual({ deviceName: null, deviceType: null });
    expect(parseUserAgentDeviceInfo(undefined)).toEqual({ deviceName: null, deviceType: null });
  });

  it('parses a desktop Chrome user agent', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
    const result = parseUserAgentDeviceInfo(ua);
    expect(result.deviceName).toBe('Chrome on Windows');
    expect(result.deviceType).toBe('desktop');
  });

  it('parses an iPhone Safari user agent', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const result = parseUserAgentDeviceInfo(ua);
    expect(result.deviceName).toBe('Safari on iOS');
    expect(result.deviceType).toBe('mobile');
  });

  it('parses an iPad user agent as tablet', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const result = parseUserAgentDeviceInfo(ua);
    expect(result.deviceType).toBe('tablet');
  });
});
