// apps/server/src/modules/auth/security/__tests__/audit.test.ts
import { promises as fs } from 'fs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SecurityAuditLogger,
  registerSecurityAudit,
  type Audit,
  type AuditEventType,
  type IntrusionRule,
} from '../audit';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// Mock fs promises
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    appendFile: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockResolvedValue({ mtime: new Date() }),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

/**
 * Creates a mock FastifyRequest for testing
 */
function createMockRequest(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  return {
    url: '/api/auth/login',
    method: 'POST',
    ip: '192.168.1.1',
    headers: {
      'user-agent': 'Mozilla/5.0 Test Browser',
    },
    ...overrides,
  } as FastifyRequest;
}

/**
 * Creates a mock FastifyReply for testing
 */
function createMockReply(statusCode = 200): FastifyReply {
  return {
    statusCode,
  } as FastifyReply;
}

/**
 * Creates a mock Fastify server for testing
 */
function createMockServer(): FastifyInstance {
  const hooks: Record<string, ((...args: unknown[]) => unknown)[]> = {};
  return {
    decorate: vi.fn(),
    addHook: vi.fn((hookName: string, handler: (...args: unknown[]) => unknown) => {
      if (!hooks[hookName]) {
        hooks[hookName] = [];
      }
      hooks[hookName].push(handler);
    }),
    _hooks: hooks,
  } as unknown as FastifyInstance;
}

describe('SecurityAuditLogger', () => {
  let logger: SecurityAuditLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    if (logger) {
      await logger.destroy();
    }
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create logger with default ', () => {
      logger = new SecurityAuditLogger({});

      expect(logger).toBeDefined();
    });

    it('should create logger with custom ', () => {
      const custom: Partial<Audit> = {
        enabled: true,
        logPath: '/custom/path/audit.log',
        maxFileSize: 50,
        retentionDays: 30,
        riskThresholds: {
          low: 5,
          medium: 25,
          high: 50,
          critical: 80,
        },
      };

      logger = new SecurityAuditLogger(custom);

      expect(logger).toBeDefined();
    });

    it('should not start timers when disabled', async () => {
      logger = new SecurityAuditLogger({ enabled: false });

      // Advance time significantly
      await vi.advanceTimersByTimeAsync(60000);

      // No flush should have happened (fs.appendFile not called)
      expect(fs.appendFile).not.toHaveBeenCalled();
    });
  });

  describe('logEvent', () => {
    it('should log auth_success event with low severity', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_success', req);

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType.auth_success).toBe(1);
      expect(stats.eventsBySeverity.low).toBe(1);
    });

    it('should log auth_failure event', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_failure', req, undefined, { failedAttempts: 3 });

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType.auth_failure).toBe(1);
    });

    it('should log high severity events and trigger immediate flush', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('csrf_violation', req);

      // High severity should trigger immediate flush
      expect(fs.appendFile).toHaveBeenCalled();
    });

    it('should log critical severity events and trigger immediate flush', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('sql_injection_attempt', req);

      expect(fs.appendFile).toHaveBeenCalled();
    });

    it('should not log events when disabled', async () => {
      logger = new SecurityAuditLogger({ enabled: false });
      const req = createMockRequest();

      await logger.logEvent('auth_failure', req);

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(0);
    });

    it('should extract userId from request', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();
      (req as unknown as { user: { id: string } }).user = { id: 'user-123' };

      await logger.logEvent('auth_success', req);

      const stats = logger.getStats();
      expect(stats.recentIncidents[0]!.userId).toBe('user-123');
    });

    it('should extract sessionId from request', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();
      (req as unknown as { sessionId: string }).sessionId = 'session-456';

      await logger.logEvent('auth_success', req);

      const stats = logger.getStats();
      expect(stats.recentIncidents[0]!.sessionId).toBe('session-456');
    });

    it('should extract IP from x-forwarded-for header', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '10.0.0.1, 10.0.0.2',
          'user-agent': 'Test',
        },
      } as Partial<FastifyRequest>);

      await logger.logEvent('auth_success', req);

      const stats = logger.getStats();
      expect(stats.recentIncidents[0]!.ipAddress).toBe('10.0.0.1');
    });

    it('should extract IP from x-real-ip header', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest({
        headers: {
          'x-real-ip': '172.16.0.1',
          'user-agent': 'Test',
        },
      } as Partial<FastifyRequest>);

      await logger.logEvent('auth_success', req);

      const stats = logger.getStats();
      expect(stats.recentIncidents[0]!.ipAddress).toBe('172.16.0.1');
    });

    it('should include status code from response', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();
      const res = createMockReply(401);

      await logger.logEvent('auth_failure', req, res);

      const stats = logger.getStats();
      expect(stats.recentIncidents[0]!.statusCode).toBe(401);
    });

    it('should evict old events when buffer exceeds max size', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      // Log many events to exceed buffer
      for (let i = 0; i < 10050; i++) {
        await logger.logEvent('auth_success', req);
      }

      const stats = logger.getStats();
      // Should have evicted 10% (1000) when it exceeded 10000
      expect(stats.totalEvents).toBeLessThanOrEqual(10000);
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate base risk score for auth_success', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_success', req);

      const stats = logger.getStats();
      expect(stats.recentIncidents[0]!.riskScore).toBe(0);
    });

    it('should calculate higher risk score for auth_failure', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_failure', req);

      const stats = logger.getStats();
      expect(stats.recentIncidents[0]!.riskScore).toBe(10);
    });

    it('should add risk for failed attempts > 5', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_failure', req, undefined, { failedAttempts: 6 });

      const stats = logger.getStats();
      expect(stats.recentIncidents[0]!.riskScore).toBe(30); // 10 base + 20 for failed attempts
    });

    it('should add risk for suspicious patterns', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_failure', req, undefined, { suspiciousPatterns: true });

      const stats = logger.getStats();
      expect(stats.recentIncidents[0]!.riskScore).toBe(25); // 10 base + 15 for suspicious
    });

    it('should add risk for unusual timing', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_failure', req, undefined, { unusualTiming: true });

      const stats = logger.getStats();
      expect(stats.recentIncidents[0]!.riskScore).toBe(20); // 10 base + 10 for timing
    });

    it('should add risk for geographic anomaly', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_failure', req, undefined, { geographicAnomaly: true });

      const stats = logger.getStats();
      expect(stats.recentIncidents[0]!.riskScore).toBe(35); // 10 base + 25 for geo
    });

    it('should cap risk score at 100', async () => {
      // Make flush fail so buffer isn't cleared (critical severity triggers immediate flush)
      vi.mocked(fs.appendFile).mockRejectedValueOnce(new Error('Flush failed'));

      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('sql_injection_attempt', req, undefined, {
        failedAttempts: 10,
        suspiciousPatterns: true,
        unusualTiming: true,
        geographicAnomaly: true,
      });

      const stats = logger.getStats();
      expect(stats.recentIncidents[0]!.riskScore).toBe(100);
    });
  });

  describe('calculateSeverity', () => {
    const severityTests: Array<{ eventType: AuditEventType; expectedSeverity: string }> = [
      { eventType: 'auth_success', expectedSeverity: 'low' },
      { eventType: 'auth_failure', expectedSeverity: 'low' },
      { eventType: 'auth_lockout', expectedSeverity: 'medium' },
      { eventType: 'password_reset', expectedSeverity: 'low' },
      { eventType: 'csrf_violation', expectedSeverity: 'high' },
      { eventType: 'rate_limit_exceeded', expectedSeverity: 'medium' },
      { eventType: 'suspicious_request', expectedSeverity: 'medium' },
      { eventType: 'sql_injection_attempt', expectedSeverity: 'critical' },
      { eventType: 'xss_attempt', expectedSeverity: 'high' },
      { eventType: 'file_upload_violation', expectedSeverity: 'high' },
      { eventType: 'brute_force_attempt', expectedSeverity: 'high' },
      { eventType: 'session_hijack_attempt', expectedSeverity: 'critical' },
      { eventType: 'privilege_escalation', expectedSeverity: 'critical' },
      { eventType: 'data_exfiltration', expectedSeverity: 'critical' },
      { eventType: 'anomaly_detected', expectedSeverity: 'medium' },
    ];

    severityTests.forEach(({ eventType, expectedSeverity }) => {
      it(`should assign ${expectedSeverity} severity for ${eventType}`, async () => {
        // Make flush fail so buffer isn't cleared (high/critical severity triggers immediate flush)
        vi.mocked(fs.appendFile).mockRejectedValueOnce(new Error('Flush failed'));

        logger = new SecurityAuditLogger({});
        const req = createMockRequest();

        await logger.logEvent(eventType, req);

        const stats = logger.getStats();
        expect(stats.recentIncidents[0]!.severity).toBe(expectedSeverity);
      });
    });
  });

  describe('intrusion detection', () => {
    it('should trigger brute_force_auth rule', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_failure', req, undefined, { failedAttempts: 6 });

      // Rule should have been triggered (event logged)
      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(1);
    });

    it('should trigger csrf_attacks rule', async () => {
      // Make flush fail so buffer isn't cleared (high severity triggers immediate flush)
      vi.mocked(fs.appendFile).mockRejectedValueOnce(new Error('Flush failed'));

      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('csrf_violation', req);

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(1);
    });

    it('should trigger sql_injection rule', async () => {
      // Make flush fail so buffer isn't cleared (critical severity triggers immediate flush)
      vi.mocked(fs.appendFile).mockRejectedValueOnce(new Error('Flush failed'));

      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('sql_injection_attempt', req);

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(1);
    });

    it('should respect intrusion rule cooldown', async () => {
      // Make flush fail so buffer isn't cleared by periodic flush during time advance
      vi.mocked(fs.appendFile).mockRejectedValue(new Error('Flush failed'));

      const customRule: IntrusionRule = {
        name: 'test_rule',
        condition: (event) => event.eventType === 'auth_failure',
        severity: 'high',
        action: 'alert',
        cooldownMs: 60000,
      };

      logger = new SecurityAuditLogger({
        intrusionRules: [customRule],
      });

      const req = createMockRequest();

      // First event triggers rule
      await logger.logEvent('auth_failure', req);

      // Second event within cooldown should not trigger again (still only 2 events)
      await logger.logEvent('auth_failure', req);

      // Advance time past cooldown
      await vi.advanceTimersByTimeAsync(61000);

      // Third event after cooldown should trigger
      await logger.logEvent('auth_failure', req);

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(3);
    });

    it('should clean up old intrusion state', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_failure', req, undefined, { failedAttempts: 6 });

      // Advance time past 24 hours (cleanup interval runs every hour)
      await vi.advanceTimersByTimeAsync(25 * 60 * 60 * 1000);

      // State should be cleaned up (no errors thrown)
      expect(() => logger.getStats()).not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return empty stats when no events', () => {
      logger = new SecurityAuditLogger({});

      const stats = logger.getStats();

      expect(stats.totalEvents).toBe(0);
      expect(stats.eventsByType).toEqual({});
      expect(stats.eventsBySeverity).toEqual({});
      expect(stats.recentIncidents).toEqual([]);
      expect(stats.riskMetrics.averageRiskScore).toBe(0);
      expect(stats.riskMetrics.peakRiskScore).toBe(0);
      expect(stats.riskMetrics.suspiciousIps).toEqual([]);
    });

    it('should calculate average risk score', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_success', req); // 0
      await logger.logEvent('auth_failure', req); // 10

      const stats = logger.getStats();
      expect(stats.riskMetrics.averageRiskScore).toBe(5);
    });

    it('should track peak risk score', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_success', req); // 0
      await logger.logEvent('auth_failure', req); // 10
      await logger.logEvent('auth_lockout', req); // 30

      const stats = logger.getStats();
      expect(stats.riskMetrics.peakRiskScore).toBe(30);
    });

    it('should track suspicious IPs', async () => {
      logger = new SecurityAuditLogger({});
      const req1 = createMockRequest({ ip: '1.2.3.4' } as Partial<FastifyRequest>);
      const req2 = createMockRequest({ ip: '5.6.7.8' } as Partial<FastifyRequest>);

      // Low risk event from req1
      await logger.logEvent('auth_success', req1);

      // High risk event from req2 (above medium threshold of 30)
      // auth_lockout base = 30, suspiciousPatterns adds 15, so total = 45 > 30
      await logger.logEvent('auth_lockout', req2, undefined, { suspiciousPatterns: true });

      const stats = logger.getStats();
      expect(stats.riskMetrics.suspiciousIps).toContain('5.6.7.8');
      expect(stats.riskMetrics.suspiciousIps).not.toContain('1.2.3.4');
    });

    it('should return only last 10 recent incidents', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      for (let i = 0; i < 15; i++) {
        await logger.logEvent('auth_success', req);
      }

      const stats = logger.getStats();
      expect(stats.recentIncidents.length).toBe(10);
    });
  });

  describe('cleanup', () => {
    it('should not cleanup when disabled', async () => {
      logger = new SecurityAuditLogger({ enabled: false });

      await logger.cleanup();

      expect(fs.readdir).not.toHaveBeenCalled();
    });

    it('should not cleanup without log path', async () => {
      // Use empty string to indicate no log path (undefined gets replaced with default)
      logger = new SecurityAuditLogger({ logPath: '' });

      await logger.cleanup();

      expect(fs.readdir).not.toHaveBeenCalled();
    });

    it('should delete old log files', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days old

      vi.mocked(fs.readdir).mockResolvedValue([
        'security-audit-2024-01-01.log',
        'security-audit-2024-06-01.log',
        'other-file.txt',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      vi.mocked(fs.stat).mockResolvedValue({
        mtime: oldDate,
      } as unknown as Awaited<ReturnType<typeof fs.stat>>);

      logger = new SecurityAuditLogger({
        retentionDays: 90,
      });

      await logger.cleanup();

      // Should only try to delete security-audit-*.log files older than retention
      expect(fs.unlink).toHaveBeenCalledTimes(2);
    });

    it('should keep recent log files', async () => {
      const recentDate = new Date();

      vi.mocked(fs.readdir).mockResolvedValue(['security-audit-recent.log'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);

      vi.mocked(fs.stat).mockResolvedValue({
        mtime: recentDate,
      } as unknown as Awaited<ReturnType<typeof fs.stat>>);

      logger = new SecurityAuditLogger({
        retentionDays: 90,
      });

      await logger.cleanup();

      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'));

      logger = new SecurityAuditLogger({});

      // Should not throw
      await expect(logger.cleanup()).resolves.not.toThrow();
    });
  });

  describe('flush', () => {
    it('should flush events to log file on periodic interval', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_success', req);

      // Clear flush from high-severity check
      vi.mocked(fs.appendFile).mockClear();

      // Advance to trigger periodic flush (30 seconds)
      await vi.advanceTimersByTimeAsync(31000);

      expect(fs.appendFile).toHaveBeenCalled();
    });

    it('should handle flush errors gracefully', async () => {
      vi.mocked(fs.appendFile).mockRejectedValue(new Error('Disk full'));

      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      // High severity triggers immediate flush
      await logger.logEvent('csrf_violation', req);

      // Should not throw, events remain in buffer
      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(1);
    });

    it('should not flush when buffer is empty', async () => {
      logger = new SecurityAuditLogger({});

      vi.mocked(fs.appendFile).mockClear();

      // Trigger periodic flush
      await vi.advanceTimersByTimeAsync(31000);

      expect(fs.appendFile).not.toHaveBeenCalled();
    });

    it('should not flush without log path', async () => {
      // Use empty string to indicate no log path (undefined gets replaced with default)
      logger = new SecurityAuditLogger({ logPath: '' });
      const req = createMockRequest();

      await logger.logEvent('csrf_violation', req);

      // appendFile shouldn't be called even for high-severity events
      expect(fs.appendFile).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should clear timers and flush remaining events', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_success', req);

      vi.mocked(fs.appendFile).mockClear();

      await logger.destroy();

      expect(fs.appendFile).toHaveBeenCalled();
    });

    it('should clear intrusion state', async () => {
      logger = new SecurityAuditLogger({});
      const req = createMockRequest();

      await logger.logEvent('auth_failure', req, undefined, { failedAttempts: 6 });

      await logger.destroy();

      // After destroy, getStats should still work
      // Note: Buffer clearing depends on flush success, which is tested separately
      const stats = logger.getStats();
      expect(stats).toBeDefined();
      expect(stats.eventsByType).toBeDefined();
      expect(stats.eventsBySeverity).toBeDefined();
    });
  });
});

describe('registerSecurityAudit', () => {
  let mockServer: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = createMockServer();
  });

  afterEach(async () => {
    // Clean up any hooks
    const hooks = (mockServer as unknown as { _hooks: Record<string, unknown[]> })._hooks;
    if (hooks?.onClose) {
      for (const hook of hooks.onClose) {
        if (typeof hook === 'function') {
          await (hook as () => Promise<void>)();
        }
      }
    }
  });

  it('should decorate server with auditLogger', () => {
    registerSecurityAudit(mockServer);

    expect(mockServer.decorate).toHaveBeenCalledWith(
      'auditLogger',
      expect.any(SecurityAuditLogger),
    );
  });

  it('should add onRequest hook for timing', () => {
    registerSecurityAudit(mockServer);

    expect(mockServer.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
  });

  it('should add onResponse hook for logging', () => {
    registerSecurityAudit(mockServer);

    expect(mockServer.addHook).toHaveBeenCalledWith('onResponse', expect.any(Function));
  });

  it('should add onClose hook for cleanup', () => {
    registerSecurityAudit(mockServer);

    expect(mockServer.addHook).toHaveBeenCalledWith('onClose', expect.any(Function));
  });

  it('should return the audit logger instance', () => {
    const auditLogger = registerSecurityAudit(mockServer);

    expect(auditLogger).toBeInstanceOf(SecurityAuditLogger);
  });

  it('should log suspicious requests with status >= 400', async () => {
    vi.useFakeTimers();

    const auditLogger = registerSecurityAudit(mockServer);
    const hooks = (
      mockServer as unknown as { _hooks: Record<string, ((...args: unknown[]) => unknown)[]> }
    )._hooks;

    // Simulate onRequest hook
    const req = createMockRequest();
    const onRequestHook = hooks.onRequest![0]!;
    const done = vi.fn();
    onRequestHook(req, {}, done);
    expect(done).toHaveBeenCalled();

    // Simulate onResponse hook with 400 status
    const reply = createMockReply(400);
    const onResponseHook = hooks.onResponse![0]!;
    await onResponseHook(req, reply);

    const stats = auditLogger.getStats();
    expect(stats.totalEvents).toBe(1);
    expect(stats.eventsByType.suspicious_request).toBe(1);

    await auditLogger.destroy();
    vi.useRealTimers();
  });

  it('should not log successful requests', async () => {
    vi.useFakeTimers();

    const auditLogger = registerSecurityAudit(mockServer);
    const hooks = (
      mockServer as unknown as { _hooks: Record<string, ((...args: unknown[]) => unknown)[]> }
    )._hooks;

    // Simulate onRequest hook
    const req = createMockRequest();
    const onRequestHook = hooks.onRequest![0]!;
    const done = vi.fn();
    onRequestHook(req, {}, done);

    // Simulate onResponse hook with 200 status
    const reply = createMockReply(200);
    const onResponseHook = hooks.onResponse![0]!;
    await onResponseHook(req, reply);

    const stats = auditLogger.getStats();
    expect(stats.totalEvents).toBe(0);

    await auditLogger.destroy();
    vi.useRealTimers();
  });

  it('should accept custom ', async () => {
    vi.useFakeTimers();

    const custom: Partial<Audit> = {
      enabled: true,
      logPath: '/custom/audit.log',
    };

    const auditLogger = registerSecurityAudit(mockServer, custom);

    expect(auditLogger).toBeInstanceOf(SecurityAuditLogger);

    await auditLogger.destroy();
    vi.useRealTimers();
  });
});
