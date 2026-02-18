// main/shared/src/system/http/user.agent.test.ts
/**
 * User Agent Parsing Tests
 */

import { describe, expect, it } from 'vitest';

import { parseUserAgent } from './user.agent';

describe('parseUserAgent', () => {
  it('returns unknown for null input', () => {
    expect(parseUserAgent(null)).toEqual({ browser: 'Unknown browser', os: 'Unknown device' });
  });

  it('returns unknown for empty string', () => {
    expect(parseUserAgent('')).toEqual({ browser: 'Unknown browser', os: 'Unknown device' });
  });

  describe('browser detection', () => {
    it('detects Chrome', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
      expect(parseUserAgent(ua).browser).toBe('Chrome');
    });

    it('detects Firefox', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0';
      expect(parseUserAgent(ua).browser).toBe('Firefox');
    });

    it('detects Safari (without Chrome)', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
      expect(parseUserAgent(ua).browser).toBe('Safari');
    });

    it('detects Edge over Chrome', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
      expect(parseUserAgent(ua).browser).toBe('Edge');
    });

    it('detects Opera over Chrome', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0';
      expect(parseUserAgent(ua).browser).toBe('Opera');
    });
  });

  describe('OS detection', () => {
    it('detects Windows', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';
      expect(parseUserAgent(ua).os).toBe('Windows');
    });

    it('detects macOS', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15';
      expect(parseUserAgent(ua).os).toBe('macOS');
    });

    it('detects Linux', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) Firefox/120.0';
      expect(parseUserAgent(ua).os).toBe('Linux');
    });

    it('detects iOS from iPhone', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1';
      expect(parseUserAgent(ua).os).toBe('iOS');
    });

    it('detects iOS from iPad', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari/604.1';
      expect(parseUserAgent(ua).os).toBe('iOS');
    });

    it('detects Android', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile Safari/537.36';
      expect(parseUserAgent(ua).os).toBe('Android');
    });
  });
});
