// main/shared/src/config/env.frontend.test.ts
import { describe, expect, it } from 'vitest';

import { FrontendEnvSchema } from './env.frontend';

describe('FrontendEnvSchema', () => {
  describe('defaults', () => {
    it('parses an empty object successfully', () => {
      const result = FrontendEnvSchema.parse({});
      expect(result).toBeDefined();
    });

    it('leaves VITE_API_URL undefined when absent', () => {
      const result = FrontendEnvSchema.parse({});
      expect(result.VITE_API_URL).toBeUndefined();
    });

    it('leaves VITE_APP_NAME undefined when absent', () => {
      const result = FrontendEnvSchema.parse({});
      expect(result.VITE_APP_NAME).toBeUndefined();
    });
  });

  describe('VITE_API_URL', () => {
    it('accepts a valid HTTP URL', () => {
      const result = FrontendEnvSchema.parse({ VITE_API_URL: 'http://localhost:3000' });
      expect(result.VITE_API_URL).toBe('http://localhost:3000');
    });

    it('accepts a valid HTTPS URL', () => {
      const result = FrontendEnvSchema.parse({
        VITE_API_URL: 'https://api.example.com',
      });
      expect(result.VITE_API_URL).toBe('https://api.example.com');
    });

    it('accepts a URL with a path', () => {
      const result = FrontendEnvSchema.parse({
        VITE_API_URL: 'https://api.example.com/v1',
      });
      expect(result.VITE_API_URL).toBe('https://api.example.com/v1');
    });

    it('rejects a URL without a protocol', () => {
      expect(() =>
        FrontendEnvSchema.parse({ VITE_API_URL: 'api.example.com' }),
      ).toThrow();
    });

    it('rejects a relative path', () => {
      expect(() =>
        FrontendEnvSchema.parse({ VITE_API_URL: '/api/v1' }),
      ).toThrow();
    });

    it('rejects a bare domain without protocol or slash', () => {
      expect(() =>
        FrontendEnvSchema.parse({ VITE_API_URL: 'localhost:3000' }),
      ).toThrow();
    });

    it('rejects a non-string value', () => {
      expect(() => FrontendEnvSchema.parse({ VITE_API_URL: 3000 })).toThrow();
    });

    it('rejects an empty string', () => {
      expect(() => FrontendEnvSchema.parse({ VITE_API_URL: '' })).toThrow();
    });

    it('rejects a very long but protocol-less URL', () => {
      const longUrl = 'a'.repeat(2000) + '.example.com';
      expect(() => FrontendEnvSchema.parse({ VITE_API_URL: longUrl })).toThrow();
    });
  });

  describe('VITE_APP_NAME', () => {
    it('accepts a simple app name', () => {
      const result = FrontendEnvSchema.parse({ VITE_APP_NAME: 'My Application' });
      expect(result.VITE_APP_NAME).toBe('My Application');
    });

    it('accepts a name with special characters', () => {
      const result = FrontendEnvSchema.parse({ VITE_APP_NAME: 'App & Dashboard v2.0' });
      expect(result.VITE_APP_NAME).toBe('App & Dashboard v2.0');
    });

    it('rejects a non-string value', () => {
      expect(() => FrontendEnvSchema.parse({ VITE_APP_NAME: 42 })).toThrow();
    });

    it('rejects a boolean value', () => {
      expect(() => FrontendEnvSchema.parse({ VITE_APP_NAME: true })).toThrow();
    });

    it('accepts an empty string (no min-length constraint)', () => {
      // The schema uses parseString without a min option, so empty string is valid
      const result = FrontendEnvSchema.parse({ VITE_APP_NAME: '' });
      expect(result.VITE_APP_NAME).toBe('');
    });
  });

  describe('both fields provided', () => {
    it('accepts both VITE_API_URL and VITE_APP_NAME together', () => {
      const result = FrontendEnvSchema.parse({
        VITE_API_URL: 'https://api.example.com',
        VITE_APP_NAME: 'My App',
      });
      expect(result.VITE_API_URL).toBe('https://api.example.com');
      expect(result.VITE_APP_NAME).toBe('My App');
    });
  });

  describe('non-object input', () => {
    it('rejects null', () => {
      expect(() => FrontendEnvSchema.parse(null)).toThrow();
    });

    it('rejects an array', () => {
      expect(() => FrontendEnvSchema.parse([])).toThrow();
    });

    it('rejects a string', () => {
      expect(() => FrontendEnvSchema.parse('https://api.example.com')).toThrow();
    });

    it('rejects a number', () => {
      expect(() => FrontendEnvSchema.parse(8080)).toThrow();
    });
  });

  describe('safeParse', () => {
    it('returns success:true for an empty object', () => {
      const result = FrontendEnvSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('returns success:true when only VITE_APP_NAME is provided', () => {
      const result = FrontendEnvSchema.safeParse({ VITE_APP_NAME: 'Dashboard' });
      expect(result.success).toBe(true);
    });

    it('returns success:false for an invalid URL without throwing', () => {
      const result = FrontendEnvSchema.safeParse({ VITE_API_URL: 'not-a-url' });
      expect(result.success).toBe(false);
    });

    it('returns success:false for a non-string VITE_APP_NAME without throwing', () => {
      const result = FrontendEnvSchema.safeParse({ VITE_APP_NAME: 99 });
      expect(result.success).toBe(false);
    });
  });
});
