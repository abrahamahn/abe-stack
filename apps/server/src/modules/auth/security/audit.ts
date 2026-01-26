// apps/server/src/modules/auth/security/audit.ts
/**
 * Security Audit Logging & Monitoring
 *
 * Comprehensive security event logging with intrusion detection capabilities.
 * Tracks authentication attempts, suspicious activities, and security violations.
 */

import { promises as fs } from 'fs';
import path from 'path';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// Extended Fastify types for audit tracking
interface RequestWithStartTime {
  startTime?: number;
}

interface RequestWithUser {
  user?: { id: string };
  sessionId?: string;
}

// ============================================================================
// Types
// ============================================================================

export interface AuditEventDetails {
  failedAttempts?: number;
  suspiciousPatterns?: boolean;
  unusualTiming?: boolean;
  geographicAnomaly?: boolean;
  statusCode?: number;
  duration?: number;
  responseTime?: number;
  [key: string]: unknown;
}

export interface AuditEvent {
  timestamp: string;
  eventType: AuditEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent?: string;
  url: string;
  method: string;
  statusCode?: number;
  details: AuditEventDetails;
  riskScore: number;
}

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

export interface AuditConfig {
  /** Enable audit logging */
  enabled: boolean;
  /** Log file path */
  logPath?: string;
  /** Maximum log file size in MB */
  maxFileSize?: number;
  /** Retention period in days */
  retentionDays?: number;
  /** Risk thresholds */
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  /** Intrusion detection rules */
  intrusionRules: IntrusionRule[];
}

export interface IntrusionRule {
  name: string;
  condition: (event: AuditEvent) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'alert' | 'block';
  cooldownMs?: number;
}

export interface AuditStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  recentIncidents: AuditEvent[];
  riskMetrics: {
    averageRiskScore: number;
    peakRiskScore: number;
    suspiciousIps: string[];
  };
}

// ============================================================================
// Audit Logger
// ============================================================================

export class SecurityAuditLogger {
  private config: AuditConfig;
  private eventBuffer: AuditEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private intrusionCleanupTimer?: NodeJS.Timeout;
  private intrusionState = new Map<string, { lastTriggered: number; count: number }>();
  private static readonly MAX_BUFFER_SIZE = 10000;
  private static readonly INTRUSION_STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly INTRUSION_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

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
   * Log a security event
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
    if (this.eventBuffer.length > SecurityAuditLogger.MAX_BUFFER_SIZE) {
      // Drop oldest 10% of events to avoid frequent evictions
      const evictCount = Math.floor(SecurityAuditLogger.MAX_BUFFER_SIZE * 0.1);
      this.eventBuffer.splice(0, evictCount);
    }

    // Flush immediately for high-severity events
    if (['high', 'critical'].includes(event.severity)) {
      await this.flush();
    }
  }

  /**
   * Get audit statistics
   */
  getStats(): AuditStats {
    // This is a simplified implementation
    // In production, you'd want to read from the log files
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
   * Clean up old log files
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
    // Extract from JWT token or session
    const reqWithUser = req as RequestWithUser;
    return reqWithUser.user?.id;
  }

  private extractSessionId(req: FastifyRequest): string | undefined {
    // Extract from session cookie or JWT
    const reqWithUser = req as RequestWithUser;
    return reqWithUser.sessionId;
  }

  private extractIpAddress(req: FastifyRequest): string {
    // Handle proxy headers
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const ip =
      (typeof forwardedFor === 'string' ? forwardedFor : '') ||
      (typeof realIp === 'string' ? realIp : '') ||
      req.ip ||
      'unknown';
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
    }, SecurityAuditLogger.INTRUSION_CLEANUP_INTERVAL_MS);
  }

  private cleanupIntrusionState(): void {
    const cutoff = Date.now() - SecurityAuditLogger.INTRUSION_STATE_MAX_AGE_MS;
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

  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    if (this.intrusionCleanupTimer) {
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
 * Register security audit logging on a Fastify instance
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
    // Store request start time for duration calculation
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
