// apps/web/src/config/__tests__/index.test.ts
import { describe, expect, it } from 'vitest';

import { clientConfig, config, createClientConfig } from '../index';

import type { ClientConfig } from '../index';

// ============================================================================
// Tests
// ============================================================================

describe('config', () => {
  describe('createClientConfig', () => {
    it('should create config with expected structure', () => {
      const testConfig = createClientConfig();

      expect(typeof testConfig.mode).toBe('string');
      expect(typeof testConfig.isDev).toBe('boolean');
      expect(typeof testConfig.isProd).toBe('boolean');
      expect(typeof testConfig.apiUrl).toBe('string');
      expect(typeof testConfig.tokenRefreshInterval).toBe('number');
      expect(typeof testConfig.uiVersion).toBe('string');
    });

    it('should set token refresh interval to 13 minutes', () => {
      const testConfig = createClientConfig();

      // 13 minutes in milliseconds
      const expectedInterval = 13 * 60 * 1000;
      expect(testConfig.tokenRefreshInterval).toBe(expectedInterval);
    });

    it('should have consistent uiVersion', () => {
      const testConfig = createClientConfig();

      expect(testConfig.uiVersion).toBe('1.1.0');
    });

    it('should strip trailing slashes from apiUrl', () => {
      const testConfig = createClientConfig();

      // apiUrl should not end with slashes
      expect(testConfig.apiUrl.endsWith('/')).toBe(false);
    });

    it('should return consistent mode values', () => {
      const testConfig = createClientConfig();

      // In test environment, these should match import.meta.env
      expect(testConfig.mode).toBe(import.meta.env.MODE);
      expect(testConfig.isDev).toBe(import.meta.env.DEV);
      expect(testConfig.isProd).toBe(import.meta.env.PROD);
    });
  });

  describe('clientConfig singleton', () => {
    it('should export a pre-created config instance', () => {
      expect(clientConfig).toBeDefined();
      expect(typeof clientConfig.mode).toBe('string');
      expect(typeof clientConfig.isDev).toBe('boolean');
      expect(typeof clientConfig.isProd).toBe('boolean');
      expect(typeof clientConfig.apiUrl).toBe('string');
      expect(typeof clientConfig.tokenRefreshInterval).toBe('number');
      expect(typeof clientConfig.uiVersion).toBe('string');
    });

    it('should have same structure as factory output', () => {
      const factoryConfig = createClientConfig();

      // Both should have the same keys
      const clientKeys = Object.keys(clientConfig).sort();
      const factoryKeys = Object.keys(factoryConfig).sort();

      expect(clientKeys).toEqual(factoryKeys);
    });
  });

  describe('config (deprecated alias)', () => {
    it('should export config as alias for clientConfig', () => {
      expect(config).toBe(clientConfig);
    });

    it('should be the same reference as clientConfig', () => {
      expect(config.mode).toBe(clientConfig.mode);
      expect(config.apiUrl).toBe(clientConfig.apiUrl);
      expect(config.uiVersion).toBe(clientConfig.uiVersion);
    });
  });

  describe('ClientConfig type', () => {
    it('should have all required properties', () => {
      const testConfig: ClientConfig = createClientConfig();

      // Type check - all properties should exist and have correct types
      expect('mode' in testConfig).toBe(true);
      expect('isDev' in testConfig).toBe(true);
      expect('isProd' in testConfig).toBe(true);
      expect('apiUrl' in testConfig).toBe(true);
      expect('tokenRefreshInterval' in testConfig).toBe(true);
      expect('uiVersion' in testConfig).toBe(true);
    });

    it('should not have extra properties', () => {
      const testConfig = createClientConfig();
      const expectedKeys = [
        'mode',
        'isDev',
        'isProd',
        'apiUrl',
        'tokenRefreshInterval',
        'uiVersion',
      ];

      expect(Object.keys(testConfig).sort()).toEqual(expectedKeys.sort());
    });
  });

  describe('environment consistency', () => {
    it('should have mutually exclusive isDev and isProd in production', () => {
      const testConfig = createClientConfig();

      // In a real environment, exactly one of these should be true
      // In test environment, both might be false (MODE=test)
      if (testConfig.isProd) {
        expect(testConfig.isDev).toBe(false);
      }
    });

    it('should have apiUrl as string (empty or valid URL)', () => {
      const testConfig = createClientConfig();

      // apiUrl should always be a string
      expect(typeof testConfig.apiUrl).toBe('string');

      // If not empty, it should be a valid URL format (no trailing slash)
      if (testConfig.apiUrl) {
        expect(testConfig.apiUrl).not.toMatch(/\/+$/);
      }
    });
  });
});
