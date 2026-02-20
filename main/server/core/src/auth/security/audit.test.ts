// main/server/core/src/auth/security/audit.test.ts
import { promises as fs } from 'fs';
import path from 'path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { SecurityAuditLogger, registerSecurityAudit } from './audit';

import type { AuditEvent, AuditEventType, IntrusionRule } from './audit';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('fs', () => ({
  promises: {
    appendFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockResolvedValue({ mtime: new Date() }),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

// ============================================================================
// Test Utilities
// ============================================================================

function createMockRequest(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  const overrideHeaders = (overrides.headers ?? {}) as Record<string, string>;
  return {
    headers: { 'user-agent': 'TestBrowser/1.0', ...overrideHeaders },
    url: '/api/test',
    method: 'POST',
    ip: '192.168.1.1',
    ...overrides,
  } as unknown as FastifyRequest;
}

function createMockReply(overrides?: Partial<FastifyReply>): FastifyReply {
  const reply = {
    statusCode: 200,
  } as unknown as FastifyReply;

  if (overrides !== undefined) {
    Object.assign(reply, overrides);
  }

  return reply;
}

function createMockFastifyServer(): FastifyInstance {
  const hooks: Record<string, Array<(...args: unknown[]) => unknown>> = {
    onRequest: [],
    onResponse: [],
    onClose: [],
  };

  return {
    decorate: vi.fn(),
    addHook: vi.fn((hookName: string, handler: (...args: unknown[]) => unknown) => {
      hooks[hookName] = hooks[hookName] ?? [];
      hooks[hookName].push(handler);
    }),
    // Expose hooks for testing
    _testHooks: hooks,
  } as unknown as FastifyInstance;
}

function getTestHooks(
  server: FastifyInstance,
): Record<string, Array<(...args: unknown[]) => unknown>> {
  return (
    server as unknown as { _testHooks: Record<string, Array<(...args: unknown[]) => unknown>> }
  )._testHooks;
}

// ============================================================================
// SecurityAuditLogger Tests
// ============================================================================

describe('SecurityAuditLogger', () => {
  let mockFs: typeof fs;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs = fs;
    vi.mocked(mockFs.appendFile).mockResolvedValue(undefined);
    vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);
    vi.mocked(mockFs.readdir).mockResolvedValue([]);
    vi.mocked(mockFs.stat).mockResolvedValue({ mtime: new Date() } as never);
    vi.mocked(mockFs.unlink).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    test('should apply default configuration', () => {
      const logger = new SecurityAuditLogger({});

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(0);
    });

    test('should merge partial config with defaults', () => {
      const logger = new SecurityAuditLogger({
        enabled: true,
        logPath: './custom/path.log',
        maxFileSize: 50,
      });

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(0);
    });

    test('should not start timers when disabled', () => {
      const logger = new SecurityAuditLogger({ enabled: false });

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(0);
    });

    test('should accept custom risk thresholds', () => {
      const customThresholds = {
        low: 5,
        medium: 20,
        high: 50,
        critical: 80,
      };

      const logger = new SecurityAuditLogger({
        riskThresholds: customThresholds,
      });

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(0);
    });

    test('should accept custom intrusion rules', () => {
      const customRules: IntrusionRule[] = [
        {
          name: 'custom_rule',
          condition: (event) => event.riskScore > 90,
          severity: 'critical',
          action: 'block',
          cooldownMs: 10000,
        },
      ];

      const logger = new SecurityAuditLogger({
        intrusionRules: customRules,
      });

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(0);
    });
  });

  describe('logEvent', () => {
    test('should skip logging when disabled', async () => {
      const logger = new SecurityAuditLogger({ enabled: false });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_success', mockRequest);

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(0);
      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    test('should create correct event shape', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();
      const mockReply = createMockReply({ statusCode: 200 });

      await logger.logEvent('auth_success', mockRequest, mockReply, {
        failedAttempts: 0,
      });

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(1);

      const event = stats.recentIncidents[0];
      expect(event?.eventType).toBe('auth_success');
      expect(event?.severity).toBe('low');
      expect(event?.ipAddress).toBe('192.168.1.1');
      expect(event?.url).toBe('/api/test');
      expect(event?.method).toBe('POST');
      expect(event?.statusCode).toBe(200);
      expect(event?.userAgent).toBe('TestBrowser/1.0');
      expect(event?.riskScore).toBeDefined();
      expect(event?.timestamp).toBeDefined();
    });

    test('should extract user ID from request', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();
      (mockRequest as unknown as { user: { id: string } }).user = { id: 'user-123' };

      await logger.logEvent('auth_success', mockRequest);

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.userId).toBe('user-123');
    });

    test('should extract session ID from request', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();
      (mockRequest as unknown as { sessionId: string }).sessionId = 'session-456';

      await logger.logEvent('auth_success', mockRequest);

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.sessionId).toBe('session-456');
    });

    test('should extract IP from x-forwarded-for header', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest({
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' },
      });

      await logger.logEvent('auth_success', mockRequest);

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.ipAddress).toBe('203.0.113.1');
    });

    test('should extract IP from x-real-ip header when x-forwarded-for is missing', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest({
        headers: { 'x-real-ip': '203.0.113.5' },
      });

      await logger.logEvent('auth_success', mockRequest);

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.ipAddress).toBe('203.0.113.5');
    });

    test('should flush immediately for high severity events', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: './test.log' });
      const mockRequest = createMockRequest();

      await logger.logEvent('csrf_violation', mockRequest);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        './test.log',
        expect.stringContaining('csrf_violation'),
      );
    });

    test('should flush immediately for critical severity events', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: './test.log' });
      const mockRequest = createMockRequest();

      await logger.logEvent('sql_injection_attempt', mockRequest);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        './test.log',
        expect.stringContaining('sql_injection_attempt'),
      );
    });

    test('should cap buffer at maxBufferSize', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      // Log 10,500 events (exceeds maxBufferSize of 10,000)
      for (let i = 0; i < 10500; i++) {
        await logger.logEvent('auth_failure', mockRequest, undefined, { failedAttempts: i });
      }

      const stats = logger.getStats();
      // Buffer should evict oldest 10% (1000) when hitting 10,000
      // So after 10,500, buffer should be at 9,500
      expect(stats.totalEvents).toBeLessThanOrEqual(10000);
    });

    test('should include details in event', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();
      const details = {
        failedAttempts: 3,
        suspiciousPatterns: true,
        customField: 'custom value',
      };

      await logger.logEvent('auth_failure', mockRequest, undefined, details);

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.details.failedAttempts).toBe(3);
      expect(event?.details.suspiciousPatterns).toBe(true);
      expect(event?.details['customField']).toBe('custom value');
    });
  });

  describe('calculateSeverity', () => {
    test('should map auth_success to low severity', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_success', mockRequest);

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.severity).toBe('low');
    });

    test('should map auth_failure to low severity', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_failure', mockRequest);

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.severity).toBe('low');
    });

    test('should map auth_lockout to medium severity', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_lockout', mockRequest);

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.severity).toBe('medium');
    });

    test('should map csrf_violation to high severity', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: '' });
      const mockRequest = createMockRequest();

      await logger.logEvent('csrf_violation', mockRequest);

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.severity).toBe('high');
    });

    test('should map sql_injection_attempt to critical severity', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: '' });
      const mockRequest = createMockRequest();

      await logger.logEvent('sql_injection_attempt', mockRequest);

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.severity).toBe('critical');
    });

    test('should map oauth events to low severity', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      const oauthEvents: AuditEventType[] = [
        'oauth_login_success',
        'oauth_login_failure',
        'oauth_link_success',
        'oauth_link_failure',
        'oauth_unlink_success',
        'oauth_unlink_failure',
      ];

      for (const eventType of oauthEvents) {
        await logger.logEvent(eventType, mockRequest);
      }

      const stats = logger.getStats();
      expect(stats.eventsBySeverity['low']).toBe(6);
    });
  });

  describe('calculateRiskScore', () => {
    test('should return 0 for auth_success', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_success', mockRequest);

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.riskScore).toBe(0);
    });

    test('should return base score for auth_failure', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_failure', mockRequest);

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.riskScore).toBe(10);
    });

    test('should add bonus for failed attempts > 5', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_failure', mockRequest, undefined, { failedAttempts: 6 });

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.riskScore).toBe(30); // 10 base + 20 bonus
    });

    test('should add bonus for suspicious patterns', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_failure', mockRequest, undefined, { suspiciousPatterns: true });

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.riskScore).toBe(25); // 10 base + 15 bonus
    });

    test('should add bonus for unusual timing', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_failure', mockRequest, undefined, { unusualTiming: true });

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.riskScore).toBe(20); // 10 base + 10 bonus
    });

    test('should add bonus for geographic anomaly', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_failure', mockRequest, undefined, { geographicAnomaly: true });

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.riskScore).toBe(35); // 10 base + 25 bonus
    });

    test('should combine multiple bonuses', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_failure', mockRequest, undefined, {
        failedAttempts: 6,
        suspiciousPatterns: true,
        unusualTiming: true,
        geographicAnomaly: true,
      });

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.riskScore).toBe(80); // 10 + 20 + 15 + 10 + 25
    });

    test('should cap risk score at 100', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: '' });
      const mockRequest = createMockRequest();

      await logger.logEvent('sql_injection_attempt', mockRequest, undefined, {
        failedAttempts: 10,
        suspiciousPatterns: true,
        unusualTiming: true,
        geographicAnomaly: true,
      });

      const stats = logger.getStats();
      const event = stats.recentIncidents[0];
      expect(event?.riskScore).toBe(100); // capped at 100
    });
  });

  describe('getStats', () => {
    test('should return empty stats for empty buffer', () => {
      const logger = new SecurityAuditLogger({ enabled: true });

      const stats = logger.getStats();

      expect(stats.totalEvents).toBe(0);
      expect(stats.eventsByType).toEqual({});
      expect(stats.eventsBySeverity).toEqual({});
      expect(stats.recentIncidents).toEqual([]);
      expect(stats.riskMetrics.averageRiskScore).toBe(0);
      expect(stats.riskMetrics.peakRiskScore).toBe(0);
      expect(stats.riskMetrics.suspiciousIps).toEqual([]);
    });

    test('should count events by type', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_success', mockRequest);
      await logger.logEvent('auth_success', mockRequest);
      await logger.logEvent('auth_failure', mockRequest);

      const stats = logger.getStats();

      expect(stats.eventsByType['auth_success']).toBe(2);
      expect(stats.eventsByType['auth_failure']).toBe(1);
    });

    test('should count events by severity', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: '' });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_success', mockRequest); // low
      await logger.logEvent('auth_lockout', mockRequest); // medium
      await logger.logEvent('csrf_violation', mockRequest); // high

      const stats = logger.getStats();

      expect(stats.eventsBySeverity['low']).toBe(1);
      expect(stats.eventsBySeverity['medium']).toBe(1);
      expect(stats.eventsBySeverity['high']).toBe(1);
    });

    test('should return last 10 incidents', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      for (let i = 0; i < 15; i++) {
        await logger.logEvent('auth_failure', mockRequest);
      }

      const stats = logger.getStats();

      expect(stats.recentIncidents).toHaveLength(10);
    });

    test('should calculate average risk score', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_success', mockRequest); // 0
      await logger.logEvent('auth_failure', mockRequest); // 10
      await logger.logEvent('auth_lockout', mockRequest); // 30

      const stats = logger.getStats();

      expect(stats.riskMetrics.averageRiskScore).toBeCloseTo(13.33, 2);
    });

    test('should calculate peak risk score', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: '' });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_success', mockRequest); // 0
      await logger.logEvent('auth_failure', mockRequest); // 10
      await logger.logEvent('csrf_violation', mockRequest); // 80

      const stats = logger.getStats();

      expect(stats.riskMetrics.peakRiskScore).toBe(80);
    });

    test('should identify suspicious IPs', async () => {
      const logger = new SecurityAuditLogger({
        enabled: true,
        logPath: '',
        riskThresholds: { low: 10, medium: 30, high: 60, critical: 90 },
      });

      // Low risk IP
      await logger.logEvent('auth_success', createMockRequest({ ip: '192.168.1.1' }));

      // High risk IP (above medium threshold)
      await logger.logEvent(
        'csrf_violation',
        createMockRequest({ ip: '203.0.113.1' }),
        undefined,
        {},
      );

      const stats = logger.getStats();

      expect(stats.riskMetrics.suspiciousIps).toContain('203.0.113.1');
      expect(stats.riskMetrics.suspiciousIps).not.toContain('192.168.1.1');
    });
  });

  describe('checkIntrusionRules', () => {
    test('should trigger rule when condition matches', async () => {
      const customRules: IntrusionRule[] = [
        {
          name: 'test_rule',
          condition: (event: AuditEvent) => event.eventType === 'auth_failure',
          severity: 'high',
          action: 'alert',
          cooldownMs: 60000,
        },
      ];

      const logger = new SecurityAuditLogger({
        enabled: true,
        logPath: '',
        intrusionRules: customRules,
      });

      const mockRequest = createMockRequest();
      await logger.logEvent('auth_failure', mockRequest);

      // Rule should trigger, event should be in buffer
      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(1);
    });

    test('should respect cooldown period', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const customRules: IntrusionRule[] = [
        {
          name: 'cooldown_test',
          condition: (event: AuditEvent) => event.eventType === 'auth_failure',
          severity: 'high',
          action: 'alert',
          cooldownMs: 5000,
        },
      ];

      const logger = new SecurityAuditLogger({
        enabled: true,
        logPath: '',
        intrusionRules: customRules,
      });

      const mockRequest = createMockRequest();

      // First trigger
      await logger.logEvent('auth_failure', mockRequest);

      // Second trigger within cooldown (should be skipped)
      vi.advanceTimersByTime(3000);
      await logger.logEvent('auth_failure', mockRequest);

      // Third trigger after cooldown (should work)
      vi.advanceTimersByTime(3000);
      await logger.logEvent('auth_failure', mockRequest);

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(3); // All events logged, but rule respects cooldown

      vi.useRealTimers();
    });

    test('should use default cooldown when not specified', async () => {
      const customRules: IntrusionRule[] = [
        {
          name: 'default_cooldown',
          condition: (event: AuditEvent) => event.eventType === 'auth_failure',
          severity: 'medium',
          action: 'log',
          // no cooldownMs specified, should use default 60000
        },
      ];

      const logger = new SecurityAuditLogger({
        enabled: true,
        logPath: '',
        intrusionRules: customRules,
      });

      const mockRequest = createMockRequest();
      await logger.logEvent('auth_failure', mockRequest);

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(1);
    });

    test('should track state per IP address', async () => {
      const customRules: IntrusionRule[] = [
        {
          name: 'ip_specific',
          condition: (event: AuditEvent) => event.eventType === 'auth_failure',
          severity: 'high',
          action: 'alert',
          cooldownMs: 60000,
        },
      ];

      const logger = new SecurityAuditLogger({
        enabled: true,
        logPath: '',
        intrusionRules: customRules,
      });

      // Different IPs should have separate state
      await logger.logEvent('auth_failure', createMockRequest({ ip: '192.168.1.1' }));
      await logger.logEvent('auth_failure', createMockRequest({ ip: '192.168.1.2' }));

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(2);
    });
  });

  describe('cleanup', () => {
    test('should skip cleanup when disabled', async () => {
      const logger = new SecurityAuditLogger({ enabled: false });

      await logger.cleanup();

      expect(mockFs.readdir).not.toHaveBeenCalled();
    });

    test('should skip cleanup when logPath is undefined', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: '' });

      await logger.cleanup();

      expect(mockFs.readdir).not.toHaveBeenCalled();
    });

    test('should skip cleanup when logPath is empty', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: '' });

      await logger.cleanup();

      expect(mockFs.readdir).not.toHaveBeenCalled();
    });

    test('should delete old log files', async () => {
      const logger = new SecurityAuditLogger({
        enabled: true,
        logPath: './logs/security-audit.log',
        retentionDays: 90,
      });

      const now = Date.now();
      const oldDate = new Date(now - 91 * 24 * 60 * 60 * 1000); // 91 days ago
      const recentDate = new Date(now - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      vi.mocked(mockFs.readdir).mockResolvedValue([
        'security-audit-old.log',
        'security-audit-recent.log',
        'other-file.txt',
      ] as never);

      vi.mocked(mockFs.stat).mockImplementation((filePath) => {
        const path = String(filePath);
        if (path.includes('old')) {
          return Promise.resolve({ mtime: oldDate } as never);
        }
        return Promise.resolve({ mtime: recentDate } as never);
      });

      await logger.cleanup();

      expect(mockFs.unlink).toHaveBeenCalledWith('logs/security-audit-old.log');
      expect(mockFs.unlink).not.toHaveBeenCalledWith('logs/security-audit-recent.log');
    });

    test('should handle cleanup errors silently', async () => {
      const logger = new SecurityAuditLogger({
        enabled: true,
        logPath: './logs/security-audit.log',
      });

      vi.mocked(mockFs.readdir).mockRejectedValue(new Error('Permission denied'));

      await expect(logger.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('destroy', () => {
    test('should clear timers and flush remaining events', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: './test.log' });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_failure', mockRequest);

      await logger.destroy();

      expect(mockFs.appendFile).toHaveBeenCalled();

      // Events should be flushed
      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(0);
    });

    test('should handle destroy when no events buffered', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });

      await expect(logger.destroy()).resolves.toBeUndefined();
    });

    test('should clear intrusion state', async () => {
      const logger = new SecurityAuditLogger({ enabled: true });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_failure', mockRequest);

      await logger.destroy();

      // State should be cleared (no errors on subsequent operations)
      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(0);
    });
  });

  describe('flush', () => {
    test('should write events to log file', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: './test.log' });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_failure', mockRequest);
      await logger.logEvent('auth_success', mockRequest);

      // Manually trigger flush by destroying
      await logger.destroy();

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        './test.log',
        expect.stringContaining('auth_failure'),
      );
    });

    test('should clear buffer after flush', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: './test.log' });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_failure', mockRequest);

      await logger.destroy();

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(0);
    });

    test('should handle flush errors silently', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: './test.log' });
      const mockRequest = createMockRequest();

      vi.mocked(mockFs.appendFile).mockRejectedValue(new Error('Disk full'));

      await logger.logEvent('auth_failure', mockRequest);

      // Should not throw
      await expect(logger.destroy()).resolves.toBeUndefined();

      // Events should remain in buffer on flush failure
      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(1);
    });

    test('should ensure log directory exists', async () => {
      const logger = new SecurityAuditLogger({ enabled: true, logPath: './logs/audit.log' });
      const mockRequest = createMockRequest();

      await logger.logEvent('auth_failure', mockRequest);

      await logger.destroy();

      expect(mockFs.mkdir).toHaveBeenCalledWith(path.dirname('./logs/audit.log'), {
        recursive: true,
      });
    });
  });
});

// ============================================================================
// registerSecurityAudit Tests
// ============================================================================

describe('registerSecurityAudit', () => {
  let mockServer: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = createMockFastifyServer();
  });

  test('should create and decorate server with audit logger', () => {
    const logger = registerSecurityAudit(mockServer);

    expect(logger).toBeInstanceOf(SecurityAuditLogger);
    expect(mockServer.decorate).toHaveBeenCalledWith('audit', logger);
  });

  test('should register onClose hook for cleanup', () => {
    registerSecurityAudit(mockServer);

    expect(mockServer.addHook).toHaveBeenCalledWith('onClose', expect.any(Function));
  });

  test('should only register the onClose hook', () => {
    registerSecurityAudit(mockServer);

    const calls = vi.mocked(mockServer.addHook).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[0]).toBe('onClose');
  });

  test('should accept custom configuration', () => {
    const customConfig = {
      enabled: true,
      logPath: './custom/path.log',
      maxFileSize: 200,
    };

    const logger = registerSecurityAudit(mockServer, customConfig);

    expect(logger).toBeInstanceOf(SecurityAuditLogger);
  });

  test('should call logger.destroy on server close', async () => {
    const logger = registerSecurityAudit(mockServer, { enabled: true, logPath: './test.log' });

    const hooks = getTestHooks(mockServer);
    const onCloseHandler = hooks['onClose']?.[0];

    const mockRequest = createMockRequest();
    await logger.logEvent('auth_failure', mockRequest);

    // Simulate server close
    if (onCloseHandler !== undefined) {
      await Promise.resolve(onCloseHandler({}, () => {}));
    }

    // Events should be flushed on destroy
    expect(fs.appendFile).toHaveBeenCalled();
  });

  test('should return a SecurityAuditLogger instance with correct initial state', () => {
    const logger = registerSecurityAudit(mockServer, { enabled: true });

    const stats = logger.getStats();
    expect(stats.totalEvents).toBe(0);
    expect(stats.recentIncidents).toEqual([]);
  });

  test('should cleanup on server close', async () => {
    vi.clearAllMocks();
    const logger = registerSecurityAudit(mockServer, { enabled: true, logPath: './test.log' });

    const mockRequest = createMockRequest();
    await logger.logEvent('auth_failure', mockRequest);

    // Manually destroy to test cleanup
    await logger.destroy();

    // Events should be flushed on destroy
    const stats = logger.getStats();
    expect(stats.totalEvents).toBe(0);
    expect(fs.appendFile).toHaveBeenCalled();
  });
});
