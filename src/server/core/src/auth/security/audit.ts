// src/server/core/src/auth/security/audit.ts
/**
 * Security Audit Logging & Monitoring
 *
 * Comprehensive security event logging with intrusion detection capabilities.
 * Tracks authentication attempts, suspicious activities, and security violations.
 *
 * @module security/audit
 */

import { promises as fs } from 'fs';
import path from 'path';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// Extended Fastify types for audit tracking
interface RequestWithStartTime {
  startTime?: number;
}

interface RequestWithUser {
  user?: { id: string; userId?: string } | undefined;
  sessionId?: string | undefined;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Detailed information about an audit event.
 */
export interface AuditEventDetails {
  /** Number of failed authentication attempts */
  failedAttempts?: number;
  /** Whether suspicious patterns were detected */
  suspiciousPatterns?: boolean;
  /** Whether the timing is unusual */
  unusualTiming?: boolean;
  /** Whether there is a geographic anomaly */
  geographicAnomaly?: boolean;
  /** HTTP status code of the response */
  statusCode?: number;
  /** Request duration in milliseconds */
  duration?: number;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Additional details */
  [key: string]: unknown;
}

/**
 * A single audit event record.
 */
export interface AuditEvent {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Type of audit event */
  eventType: AuditEventType;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** User ID (if authenticated) */
  userId?: string | undefined;
  /** Session ID (if available) */
  sessionId?: string | undefined;
  /** Client IP address */
  ipAddress: string;
  /** Client user agent */
  userAgent?: string | undefined;
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Response status code */
  statusCode?: number | undefined;
  /** Event details */
  details: AuditEventDetails;
  /** Calculated risk score (0-100) */
  riskScore: number;
}

/**
 * Type of audit event tracked by the system.
 */
export type AuditEventType =
  | 'auth_success'
  | 'auth_failure'
  | 'auth_lockout'
  | 'password_reset'
  | 'csrf_violation'
  | 'rate_limit_exceeded'
  | 'suspicious_request'
  | 'sql_injection_attempt'
  | 'xss_attempt'
  | 'file_upload_violation'
  | 'brute_force_attempt'
  | 'session_hijack_attempt'
  | 'privilege_escalation'
  | 'data_exfiltration'
  | 'anomaly_detected'
  // OAuth-specific events
  | 'oauth_login_success'
  | 'oauth_login_failure'
  | 'oauth_link_success'
  | 'oauth_link_failure'
  | 'oauth_unlink_success'
  | 'oauth_unlink_failure';

/**
 * Configuration for the audit logging system.
 */
export interface AuditConfig {
  /** Enable audit logging */
  enabled: boolean;
  /** Log file path */
  logPath?: string;
  /** Maximum log file size in MB */
  maxFileSize?: number;
  /** Retention period in days */
  retentionDays?: number;
  /** Risk thresholds for severity classification */
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  /** Intrusion detection rules */
  intrusionRules: IntrusionRule[];
}

/**
 * A rule for intrusion detection.
 */
export interface IntrusionRule {
  /** Rule name for identification */
  name: string;
  /** Condition function that triggers the rule */
  condition: (event: AuditEvent) => boolean;
  /** Severity of the intrusion */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Action to take when triggered */
  action: 'log' | 'alert' | 'block';
  /** Cooldown period in milliseconds */
  cooldownMs?: number;
}

/**
 * Aggregated audit statistics.
 */
export interface AuditStats {
  /** Total number of events in buffer */
  totalEvents: number;
  /** Events grouped by type */
  eventsByType: Record<string, number>;
  /** Events grouped by severity */
  eventsBySeverity: Record<string, number>;
  /** Most recent incidents */
  recentIncidents: AuditEvent[];
  /** Risk analysis metrics */
  riskMetrics: {
    averageRiskScore: number;
    peakRiskScore: number;
    suspiciousIps: string[];
  };
}

// ============================================================================
// Audit Logger
// ============================================================================

/**
 * Security audit logger with intrusion detection capabilities.
 *
 * Buffers events for batch writing and supports real-time intrusion detection.
 *
 * @complexity O(1) per event logging, O(n) for stats computation
 */
export class SecurityAuditLogger {
  private readonly config: AuditConfig;
  private eventBuffer: AuditEvent[] = [];
  private flushTimer?: NodeJS.Timeout | undefined;
  private intrusionCleanupTimer?: NodeJS.Timeout | undefined;
  private readonly intrusionState = new Map<string, { lastTriggered: number; count: number }>();
  private static readonly maxBufferSize = 10000;
  private static readonly intrusionStateMaxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly intrusionCleanupIntervalMs = 60 * 60 * 1000; // 1 hour

  /**
   * @param config - Partial audit configuration (defaults applied)
   */
  constructor(config: Partial<AuditConfig>) {
    const defaultRiskThresholds = {
      low: 10,
      medium: 30,
      high: 60,
      critical: 90,
    };

    this.config = {
      enabled: config.enabled ?? true,
      logPath: config.logPath ?? './logs/security-audit.log',
      maxFileSize: config.maxFileSize ?? 100, // 100MB
      retentionDays: config.retentionDays ?? 90,
      riskThresholds: config.riskThresholds ?? defaultRiskThresholds,
      intrusionRules: config.intrusionRules ?? this.getDefaultIntrusionRules(),
    };

    if (this.config.enabled) {
      this.startPeriodicFlush();
      this.startIntrusionStateCleanup();
      void this.ensureLogDirectory();
    }
  }

  /**
   * Log a security event.
   *
   * @param eventType - Type of audit event
   * @param req - Fastify request
   * @param res - Fastify reply (optional)
   * @param details - Additional event details
   * @returns Promise that resolves when event is buffered/flushed
   * @complexity O(1) amortized, O(n) when flushing
   */
  async logEvent(
    eventType: AuditEventType,
    req: FastifyRequest,
    res?: FastifyReply,
    details: AuditEventDetails = {},
  ): Promise<void> {
    if (!this.config.enabled) return;

    const event: AuditEvent = {
      timestamp: new Date().toISOString(),
      eventType,
      severity: this.calculateSeverity(eventType, details),
      userId: this.extractUserId(req),
      sessionId: this.extractSessionId(req),
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'],
      url: req.url,
      method: req.method,
      statusCode: res?.statusCode,
      details,
      riskScore: this.calculateRiskScore(eventType, details, req),
    };

    // Check intrusion detection rules
    this.checkIntrusionRules(event);

    // Buffer the event for batch writing, with size limit
    this.eventBuffer.push(event);

    // Evict oldest events if buffer exceeds max size
    if (this.eventBuffer.length > SecurityAuditLogger.maxBufferSize) {
      // Drop oldest 10% of events to avoid frequent evictions
      const evictCount = Math.floor(SecurityAuditLogger.maxBufferSize * 0.1);
      this.eventBuffer.splice(0, evictCount);
    }

    // Flush immediately for high-severity events
    if (['high', 'critical'].includes(event.severity)) {
      await this.flush();
    }
  }

  /**
   * Get audit statistics from the event buffer.
   *
   * @returns Aggregated audit stats
   * @complexity O(n) where n is the buffer size
   */
  getStats(): AuditStats {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const suspiciousIps = new Set<string>();

    for (const event of this.eventBuffer) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] ?? 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] ?? 0) + 1;

      if (event.riskScore > this.config.riskThresholds.medium) {
        suspiciousIps.add(event.ipAddress);
      }
    }

    return {
      totalEvents: this.eventBuffer.length,
      eventsByType,
      eventsBySeverity,
      recentIncidents: this.eventBuffer.slice(-10),
      riskMetrics: {
        averageRiskScore:
          this.eventBuffer.length > 0
            ? this.eventBuffer.reduce((sum, e) => sum + e.riskScore, 0) / this.eventBuffer.length
            : 0,
        peakRiskScore:
          this.eventBuffer.length > 0 ? Math.max(...this.eventBuffer.map((e) => e.riskScore)) : 0,
        suspiciousIps: Array.from(suspiciousIps),
      },
    };
  }

  /**
   * Clean up old log files based on retention policy.
   *
   * @returns Promise that resolves when cleanup is complete
   * @complexity O(n) where n is the number of log files
   */
  async cleanup(): Promise<void> {
    if (!this.config.enabled) return;

    const logPath = this.config.logPath;
    const retentionDays = this.config.retentionDays;

    if (logPath === undefined || logPath === '' || retentionDays === undefined) return;

    try {
      const logDir = path.dirname(logPath);
      const files = await fs.readdir(logDir);

      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
      const cutoffTime = Date.now() - retentionMs;

      for (const file of files) {
        if (file.startsWith('security-audit-') && file.endsWith('.log')) {
          const filePath = path.join(logDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
          }
        }
      }
    } catch {
      // Cleanup is non-critical, silently continue if it fails
    }
  }

  private calculateSeverity(
    eventType: AuditEventType,
    _details: AuditEventDetails,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<AuditEventType, 'low' | 'medium' | 'high' | 'critical'> = {
      auth_success: 'low',
      auth_failure: 'low',
      auth_lockout: 'medium',
      password_reset: 'low',
      csrf_violation: 'high',
      rate_limit_exceeded: 'medium',
      suspicious_request: 'medium',
      sql_injection_attempt: 'critical',
      xss_attempt: 'high',
      file_upload_violation: 'high',
      brute_force_attempt: 'high',
      session_hijack_attempt: 'critical',
      privilege_escalation: 'critical',
      data_exfiltration: 'critical',
      anomaly_detected: 'medium',
      // OAuth events
      oauth_login_success: 'low',
      oauth_login_failure: 'low',
      oauth_link_success: 'low',
      oauth_link_failure: 'low',
      oauth_unlink_success: 'low',
      oauth_unlink_failure: 'low',
    };

    return severityMap[eventType];
  }

  private calculateRiskScore(
    eventType: AuditEventType,
    details: AuditEventDetails,
    _req: FastifyRequest,
  ): number {
    let score = 0;

    // Base score from event type
    const baseScores: Record<AuditEventType, number> = {
      auth_success: 0,
      auth_failure: 10,
      auth_lockout: 30,
      password_reset: 5,
      csrf_violation: 80,
      rate_limit_exceeded: 20,
      suspicious_request: 25,
      sql_injection_attempt: 100,
      xss_attempt: 70,
      file_upload_violation: 60,
      brute_force_attempt: 75,
      session_hijack_attempt: 100,
      privilege_escalation: 100,
      data_exfiltration: 100,
      anomaly_detected: 40,
      // OAuth events
      oauth_login_success: 0,
      oauth_login_failure: 10,
      oauth_link_success: 0,
      oauth_link_failure: 10,
      oauth_unlink_success: 5,
      oauth_unlink_failure: 10,
    };

    score += baseScores[eventType];

    // Additional factors
    const failedAttempts = details.failedAttempts ?? 0;
    if (failedAttempts > 5) score += 20;
    if (details.suspiciousPatterns === true) score += 15;
    if (details.unusualTiming === true) score += 10;
    if (details.geographicAnomaly === true) score += 25;

    // Cap at 100
    return Math.min(score, 100);
  }

  private checkIntrusionRules(event: AuditEvent): void {
    for (const rule of this.config.intrusionRules) {
      if (rule.condition(event)) {
        const stateKey = `${rule.name}:${event.ipAddress}`;
        const state = this.intrusionState.get(stateKey) ?? { lastTriggered: 0, count: 0 };
        const now = Date.now();

        // Check cooldown
        if (now - state.lastTriggered < (rule.cooldownMs ?? 60000)) {
          continue;
        }

        state.count++;
        state.lastTriggered = now;
        this.intrusionState.set(stateKey, state);

        // Trigger action - log intrusion events to the event buffer for file-based logging
        // In production, this would integrate with alerting systems
        if (rule.action === 'alert' || rule.action === 'log') {
          // Intrusion events are captured through the event buffer and flushed to logs
          // The event is already added to eventBuffer in logEvent()
          // Additional alerting can be configured through external integrations
        }
        // 'block' would require integration with firewall/rate limiter
      }
    }
  }

  private getDefaultIntrusionRules(): IntrusionRule[] {
    return [
      {
        name: 'brute_force_auth',
        condition: (event) =>
          event.eventType === 'auth_failure' && (event.details.failedAttempts ?? 0) > 5,
        severity: 'high',
        action: 'alert',
        cooldownMs: 300000, // 5 minutes
      },
      {
        name: 'csrf_attacks',
        condition: (event) => event.eventType === 'csrf_violation',
        severity: 'high',
        action: 'alert',
        cooldownMs: 60000, // 1 minute
      },
      {
        name: 'sql_injection',
        condition: (event) => event.eventType === 'sql_injection_attempt',
        severity: 'critical',
        action: 'alert',
        cooldownMs: 30000, // 30 seconds
      },
      {
        name: 'suspicious_ips',
        condition: (event) => event.riskScore > 70 && event.details.geographicAnomaly === true,
        severity: 'high',
        action: 'log',
        cooldownMs: 3600000, // 1 hour
      },
    ];
  }

  private extractUserId(req: FastifyRequest): string | undefined {
    const reqWithUser = req as unknown as RequestWithUser;
    return reqWithUser.user?.id ?? reqWithUser.user?.userId;
  }

  private extractSessionId(req: FastifyRequest): string | undefined {
    const reqWithUser = req as unknown as RequestWithUser;
    return reqWithUser.sessionId;
  }

  private extractIpAddress(req: FastifyRequest): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const ip =
      typeof forwardedFor === 'string' && forwardedFor !== ''
        ? forwardedFor
        : typeof realIp === 'string' && realIp !== ''
          ? realIp
          : req.ip !== ''
            ? req.ip
            : 'unknown';
    const parts = ip.split(',');
    return (parts[0] ?? 'unknown').trim();
  }

  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const logPath = this.config.logPath;
    if (logPath === undefined || logPath === '') return;

    try {
      await this.ensureLogDirectory();

      const logEntries = this.eventBuffer.map((event) => JSON.stringify(event)).join('\n') + '\n';

      await fs.appendFile(logPath, logEntries);
      this.eventBuffer = [];
    } catch {
      // Flush failure is non-critical, events remain in buffer for next attempt
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, 30000); // Flush every 30 seconds
  }

  private startIntrusionStateCleanup(): void {
    this.intrusionCleanupTimer = setInterval(() => {
      this.cleanupIntrusionState();
    }, SecurityAuditLogger.intrusionCleanupIntervalMs);
  }

  private cleanupIntrusionState(): void {
    const cutoff = Date.now() - SecurityAuditLogger.intrusionStateMaxAgeMs;
    for (const [key, state] of this.intrusionState.entries()) {
      if (state.lastTriggered < cutoff) {
        this.intrusionState.delete(key);
      }
    }
  }

  private async ensureLogDirectory(): Promise<void> {
    const logPath = this.config.logPath;
    if (logPath === undefined || logPath === '') return;

    try {
      const logDir = path.dirname(logPath);
      await fs.mkdir(logDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }

  /**
   * Destroy the audit logger and flush remaining events.
   *
   * @returns Promise that resolves when cleanup is complete
   */
  async destroy(): Promise<void> {
    if (this.flushTimer != null) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    if (this.intrusionCleanupTimer != null) {
      clearInterval(this.intrusionCleanupTimer);
      this.intrusionCleanupTimer = undefined;
    }
    await this.flush();
    this.intrusionState.clear();
  }
}

// ============================================================================
// Fastify Plugin
// ============================================================================

/**
 * Register security audit logging on a Fastify instance.
 *
 * @param server - Fastify instance
 * @param config - Partial audit configuration
 * @returns The created SecurityAuditLogger instance
 * @complexity O(1)
 */
export function registerSecurityAudit(
  server: FastifyInstance,
  config: Partial<AuditConfig> = {},
): SecurityAuditLogger {
  const auditLogger = new SecurityAuditLogger(config);

  // Decorate server with audit logger
  server.decorate('auditLogger', auditLogger);

  // Hook into request lifecycle for automatic logging
  server.addHook('onRequest', (req: FastifyRequest, _reply, done) => {
    const reqWithTime = req as RequestWithStartTime;
    reqWithTime.startTime = Date.now();
    done();
  });

  server.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    const reqWithTime = req as RequestWithStartTime;
    const duration = Date.now() - (reqWithTime.startTime ?? Date.now());

    // Log suspicious requests
    if (reply.statusCode >= 400) {
      await auditLogger.logEvent('suspicious_request', req, reply, {
        statusCode: reply.statusCode,
        duration,
        responseTime: duration,
      });
    }
  });

  // Cleanup on server close
  server.addHook('onClose', async () => {
    await auditLogger.destroy();
  });

  return auditLogger;
}
