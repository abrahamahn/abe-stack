#!/usr/bin/env node

/**
 * ABE Stack Cross-Platform Development Environment Startup
 * Enhanced with unified logging and infrastructure monitoring
 */

import { execSync, spawn, ChildProcess } from "child_process";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as http from "http";

// ==================== Type Definitions ====================

interface PortsConfig {
  readonly BACKEND: number;
  readonly FRONTEND: number;
  readonly POSTGRES: number;
}

interface ColorsConfig {
  readonly reset: string;
  readonly bright: string;
  readonly dim: string;
  readonly red: string;
  readonly green: string;
  readonly yellow: string;
  readonly blue: string;
  readonly magenta: string;
  readonly cyan: string;
  readonly white: string;
  readonly gray: string;
  readonly brightRed: string;
  readonly brightGreen: string;
  readonly brightYellow: string;
  readonly brightBlue: string;
  readonly brightMagenta: string;
  readonly brightCyan: string;
}

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4,
  SYSTEM = 5,
}

type ServiceName =
  | "SYSTEM"
  | "BACKEND"
  | "FRONTEND"
  | "DATABASE"
  | "INFRASTRUCTURE"
  | "MONITOR"
  | "INTEGRATION"
  | "SUMMARY";

interface LogEntry {
  timestamp: string;
  uptime: string;
  level: keyof typeof LogLevel;
  service: ServiceName;
  message: string;
  data?: Record<string, unknown>;
  error?: Error | string;
}

interface ServiceStatus {
  status: "starting" | "running" | "connected" | "checking" | "error" | "stopped";
  port: number | null;
  pid: number | null;
  uptime: number;
  connections?: number;
}

interface InfrastructureStatus {
  backend: ServiceStatus;
  frontend: ServiceStatus;
  database: ServiceStatus & { connections: number };
}

interface EnhancedLoggerOptions {
  quiet?: boolean;
  verbose?: boolean;
  jsonFormat?: boolean;
}

interface ProcessInfo {
  pid: string;
  name: string;
}

interface PortCheckResult {
  inUse: boolean;
  process: ProcessInfo | null;
}

interface OSInfo {
  name: string;
  platform: "windows" | "macos" | "linux" | "unknown";
  shell: string;
  scriptExt: ".bat" | ".sh" | ".ps1";
  killCommand: string;
  netstatCommand: string;
}

interface LevelFormat {
  color: string;
  icon: string;
}

interface ServiceColor {
  [key: string]: string;
}

interface HealthCheckResult {
  healthy: boolean;
  data: Record<string, unknown> | null;
  error?: string;
}

interface ServerStatusData {
  infrastructure?: {
    database?: {
      connected: boolean;
      activeConnections?: number;
    };
    cache?: {
      active: boolean;
      hits?: number;
    };
    websocket?: {
      active: boolean;
      clients?: number;
    };
    storage?: {
      active: boolean;
      path?: string;
    };
    services?: Record<string, { active: boolean }>;
  };
  server?: {
    uptime?: string;
    pid?: number;
    environment?: string;
  };
}

interface StructuredLog {
  level?: string;
  severity?: string;
  message?: string;
  msg?: string;
  timestamp?: string;
  correlationId?: string;
  context?: unknown;
  metadata?: unknown;
  service?: string;
  connected?: boolean;
  status?: string;
  connections?: number;
}

interface StartupOptions {
  force?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  jsonFormat?: boolean;
  nodeOnly?: boolean;
  help?: boolean;
}

// ==================== Configuration ====================

const PORTS: PortsConfig = {
  BACKEND: 8080,
  FRONTEND: 5173,
  POSTGRES: 5432,
};

const colors: ColorsConfig = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[94m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
};

// ==================== Enhanced Logger Class ====================

class EnhancedLogger {
  private quiet: boolean;
  private verbose: boolean;
  private jsonFormat: boolean;
  private startTime: number;
  private logBuffer: LogEntry[];
  private maxBufferSize: number;
  public infrastructureStatus: InfrastructureStatus;

  constructor(options: EnhancedLoggerOptions = {}) {
    this.quiet = options.quiet || false;
    this.verbose = options.verbose || false;
    this.jsonFormat = options.jsonFormat || false;
    this.startTime = Date.now();
    this.logBuffer = [];
    this.maxBufferSize = 1000;
    this.infrastructureStatus = {
      backend: { status: "starting", port: null, pid: null, uptime: 0 },
      frontend: { status: "starting", port: null, pid: null, uptime: 0 },
      database: { status: "checking", port: PORTS.POSTGRES, pid: null, uptime: 0, connections: 0 },
    };
  }

  log(
    level: LogLevel,
    service: ServiceName,
    message: string,
    data: { data?: Record<string, unknown>; error?: Error | string } = {}
  ): void {
    if (this.quiet && level < LogLevel.WARN) return;

    const timestamp = new Date().toISOString();
    const uptime = ((Date.now() - this.startTime) / 1000).toFixed(1);

    const logEntry: LogEntry = {
      timestamp,
      uptime: `${uptime}s`,
      level: LogLevel[level] as keyof typeof LogLevel,
      service,
      message,
      ...data,
    };

    this.logBuffer.push(logEntry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    if (this.jsonFormat) {
      console.log(JSON.stringify(logEntry, null, 2));
      return;
    }

    this.formatConsoleOutput(logEntry);
  }

  private formatConsoleOutput(entry: LogEntry): void {
    const { level, service, message, uptime } = entry;

    const serviceColors: ServiceColor = {
      SYSTEM: colors.brightMagenta,
      BACKEND: colors.brightCyan,
      FRONTEND: colors.brightGreen,
      DATABASE: colors.brightBlue,
      INFRASTRUCTURE: colors.brightYellow,
      MONITOR: colors.cyan,
    };

    const levelFormats: Record<string, LevelFormat> = {
      DEBUG: { color: colors.gray, icon: "🔍" },
      INFO: { color: colors.blue, icon: "ℹ️" },
      WARN: { color: colors.yellow, icon: "⚠️" },
      ERROR: { color: colors.red, icon: "❌" },
      SUCCESS: { color: colors.green, icon: "✅" },
      SYSTEM: { color: colors.magenta, icon: "🔧" },
    };

    const serviceColor = serviceColors[service] || colors.white;
    const levelFormat = levelFormats[level] || levelFormats.INFO;
    const serviceTag = `[${service}]`.padEnd(14);
    const timeTag = `${colors.dim}${uptime}${colors.reset}`;

    console.log(
      `${timeTag} ${levelFormat.icon} ${serviceColor}${serviceTag}${colors.reset} ${levelFormat.color}${message}${colors.reset}`
    );

    if (entry.data && Object.keys(entry.data).length > 0) {
      this.formatStructuredData(entry.data, "  ");
    }

    if (entry.error) {
      this.formatError(entry.error, "  ");
    }
  }

  private formatStructuredData(data: Record<string, unknown>, indent = ""): void {
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        console.log(`${indent}${colors.cyan}${key}:${colors.reset}`);
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            console.log(
              `${indent}  ${colors.gray}[${index}]${colors.reset} ${this.formatValue(item)}`
            );
          });
        } else {
          this.formatStructuredData(value as Record<string, unknown>, indent + "  ");
        }
      } else {
        console.log(
          `${indent}${colors.cyan}${key}:${colors.reset} ${this.formatValue(value)}`
        );
      }
    });
  }

  private formatValue(value: unknown): string {
    if (typeof value === "string")
      return `${colors.green}"${value}"${colors.reset}`;
    if (typeof value === "number")
      return `${colors.yellow}${value}${colors.reset}`;
    if (typeof value === "boolean")
      return `${colors.magenta}${value}${colors.reset}`;
    if (value === null) return `${colors.gray}null${colors.reset}`;
    if (value === undefined) return `${colors.gray}undefined${colors.reset}`;
    return String(value);
  }

  private formatError(error: Error | string, indent = ""): void {
    if (typeof error === "string") {
      console.log(`${indent}${colors.red}Error: ${error}${colors.reset}`);
      return;
    }

    if (error.message) {
      console.log(
        `${indent}${colors.red}Error: ${error.message}${colors.reset}`
      );
    }

    if ("code" in error && error.code) {
      console.log(
        `${indent}${colors.yellow}Code: ${error.code}${colors.reset}`
      );
    }

    if (error.stack && this.verbose) {
      const stackLines = error.stack.split("\n").slice(1, 4);
      stackLines.forEach((line) => {
        const cleanLine = line.trim().replace(/^\s*at\s+/, "");
        console.log(`${indent}  ${colors.gray}→ ${cleanLine}${colors.reset}`);
      });
    }
  }

  parseServerOutput(data: Buffer, service: ServiceName): void {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());

    lines.forEach((line) => {
      try {
        if (line.trim().startsWith("{") && line.trim().endsWith("}")) {
          const parsed: StructuredLog = JSON.parse(line);
          this.handleStructuredLog(parsed, service);
        } else {
          this.handlePlainTextLog(line, service);
        }
      } catch (error) {
        this.handlePlainTextLog(line, service);
      }
    });
  }

  private handleStructuredLog(logData: StructuredLog, service: ServiceName): void {
    const level = this.mapLogLevel(logData.level || logData.severity || "info");
    const message = logData.message || logData.msg || "Structured log entry";

    const metadata: Record<string, unknown> = {
      ...(logData.timestamp && { timestamp: logData.timestamp }),
      ...(logData.correlationId && { correlationId: logData.correlationId }),
      ...(logData.context && { context: logData.context }),
      ...(logData.metadata && { metadata: logData.metadata }),
    };

    this.log(level, service, message, { data: metadata });
    this.updateInfrastructureStatus(logData, service);
  }

  private handlePlainTextLog(line: string, service: ServiceName): void {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    const patterns = {
      error: /error|failed|exception|crash/i,
      warn: /warn|warning|deprecated/i,
      success: /success|completed|ready|listening|connected/i,
      port: /port\s+(\d+)/i,
      database: /database|postgres|sql/i,
      startup: /starting|initializing|loading/i,
    };

    let level = LogLevel.INFO;
    const detectedInfo: Record<string, unknown> = {};

    if (patterns.error.test(trimmedLine)) level = LogLevel.ERROR;
    else if (patterns.warn.test(trimmedLine)) level = LogLevel.WARN;
    else if (patterns.success.test(trimmedLine)) level = LogLevel.SUCCESS;

    const portMatch = trimmedLine.match(patterns.port);
    if (portMatch) {
      detectedInfo.port = parseInt(portMatch[1]);
      this.updateServicePort(service, detectedInfo.port as number);
    }

    const cleanMessage = trimmedLine
      .replace(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]\s*/, "")
      .replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s*/, "")
      .replace(/^(INFO|WARN|ERROR|DEBUG)\s*:?\s*/i, "");

    this.log(level, service, cleanMessage, { data: detectedInfo });
  }

  private mapLogLevel(levelString: string): LogLevel {
    const levelMap: Record<string, LogLevel> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      warning: LogLevel.WARN,
      error: LogLevel.ERROR,
      success: LogLevel.SUCCESS,
    };
    return levelMap[levelString.toLowerCase()] || LogLevel.INFO;
  }

  private updateServicePort(service: ServiceName, port: number): void {
    const serviceKey = service.toLowerCase() as keyof InfrastructureStatus;
    if (this.infrastructureStatus[serviceKey]) {
      this.infrastructureStatus[serviceKey].port = port;
      this.infrastructureStatus[serviceKey].status = "running";
    }
  }

  private updateInfrastructureStatus(logData: StructuredLog, service: ServiceName): void {
    if (logData.service === "database" || service === "DATABASE") {
      if (logData.connected || logData.status === "connected") {
        this.infrastructureStatus.database.status = "connected";
      }
      if (logData.connections) {
        this.infrastructureStatus.database.connections = logData.connections as number;
      }
    }
  }

  displayInfrastructureDashboard(): void {
    if (this.quiet) return;

    console.log("");
    this.printSectionHeader("Development Environment Status");

    const tableWidth = 80;
    const border = "┌" + "─".repeat(tableWidth - 2) + "┐";
    const separator = "├" + "─".repeat(tableWidth - 2) + "┤";
    const bottom = "└" + "─".repeat(tableWidth - 2) + "┘";

    console.log(border);
    console.log(
      `│${colors.bright} Development Services${colors.reset}`.padEnd(
        tableWidth + 8
      ) + "│"
    );
    console.log(separator);

    Object.entries(this.infrastructureStatus).forEach(([service, status]) => {
      const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
      const statusColor = this.getStatusColor(status.status);
      const statusText = status.status.toUpperCase();

      let details = "";
      if (status.port) details += `Port: ${status.port}`;
      if (status.pid) details += ` PID: ${status.pid}`;
      if ("connections" in status && status.connections) details += ` Connections: ${status.connections}`;
      if (status.uptime) details += ` Uptime: ${status.uptime}s`;

      const line = `│ ${serviceName.padEnd(12)} │ ${statusColor}${statusText.padEnd(12)}${colors.reset} │ ${details.padEnd(30)} │`;
      console.log(line);
    });

    console.log(bottom);
    console.log("");
  }

  private getStatusColor(status: ServiceStatus["status"]): string {
    const statusColors: Record<ServiceStatus["status"], string> = {
      starting: colors.yellow,
      running: colors.green,
      connected: colors.green,
      checking: colors.cyan,
      error: colors.red,
      stopped: colors.gray,
    };
    return statusColors[status] || colors.white;
  }

  printSectionHeader(title: string): void {
    const width = 60;
    const padding = Math.max(0, Math.floor((width - title.length) / 2));

    console.log("");
    console.log(colors.brightMagenta + "═".repeat(width) + colors.reset);
    console.log(
      colors.brightMagenta +
        " ".repeat(padding) +
        title +
        " ".repeat(width - padding - title.length) +
        colors.reset
    );
    console.log(colors.brightMagenta + "═".repeat(width) + colors.reset);
    console.log("");
  }

  displaySystemInfo(): void {
    const osInfo = detectOS();
    const memUsage = process.memoryUsage();

    this.log(LogLevel.SYSTEM, "SYSTEM", "Development Environment Information");
    this.log(
      LogLevel.INFO,
      "SYSTEM",
      `Operating System: ${osInfo.name} (${osInfo.platform})`,
      {
        data: {
          arch: os.arch(),
          platform: os.platform(),
          release: os.release(),
          cpus: os.cpus().length,
          memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
        },
      }
    );

    this.log(LogLevel.INFO, "SYSTEM", "Node.js Process Information", {
      data: {
        version: process.version,
        pid: process.pid,
        memory: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        },
      },
    });
  }

  async checkPortWithDetails(port: number): Promise<PortCheckResult> {
    try {
      const osInfo = detectOS();
      let processInfo: ProcessInfo | null = null;

      if (osInfo.platform === "windows") {
        try {
          const output = execSync(`netstat -ano | findstr :${port}`, {
            encoding: "utf8",
            stdio: "pipe",
          });

          if (output.includes("LISTENING")) {
            const lines = output
              .split("\n")
              .filter((line) => line.includes("LISTENING"));
            const parts = lines[0].trim().split(/\s+/);
            const pid = parts[parts.length - 1];

            try {
              const processName = execSync(
                `tasklist /fi "PID eq ${pid}" /fo csv /nh`,
                {
                  encoding: "utf8",
                  stdio: "pipe",
                }
              )
                .split(",")[0]
                .replace(/"/g, "");

              processInfo = { pid, name: processName };
            } catch (e) {
              processInfo = { pid, name: "unknown" };
            }
          }
        } catch (e) {
          // Port is free
        }
      } else {
        try {
          const output = execSync(`lsof -i :${port} -t`, {
            encoding: "utf8",
            stdio: "pipe",
          });

          const pid = output.trim();
          if (pid) {
            try {
              const processName = execSync(`ps -p ${pid} -o comm=`, {
                encoding: "utf8",
                stdio: "pipe",
              }).trim();

              processInfo = { pid, name: processName };
            } catch (e) {
              processInfo = { pid, name: "unknown" };
            }
          }
        } catch (e) {
          // Port is free
        }
      }

      return {
        inUse: !!processInfo,
        process: processInfo,
      };
    } catch (error) {
      return { inUse: false, process: null };
    }
  }

  async killProcessOnPortEnhanced(port: number): Promise<boolean> {
    const portInfo = await this.checkPortWithDetails(port);

    if (!portInfo.inUse) {
      this.log(LogLevel.SUCCESS, "SYSTEM", `Port ${port} is already free`);
      return true;
    }

    this.log(LogLevel.WARN, "SYSTEM", `Killing process on port ${port}`, {
      data: {
        pid: portInfo.process!.pid,
        processName: portInfo.process!.name,
      },
    });

    try {
      const osInfo = detectOS();

      if (osInfo.platform === "windows") {
        execSync(`taskkill /f /pid ${portInfo.process!.pid}`, {
          stdio: "ignore",
        });
      } else {
        execSync(`kill -9 ${portInfo.process!.pid}`, { stdio: "ignore" });
      }

      this.log(
        LogLevel.SUCCESS,
        "SYSTEM",
        `Successfully killed process ${portInfo.process!.pid} on port ${port}`
      );
      return true;
    } catch (error) {
      this.log(
        LogLevel.ERROR,
        "SYSTEM",
        `Failed to kill process on port ${port}`,
        { error: error as Error }
      );
      return false;
    }
  }

  async monitorService(serviceName: string, port: number, timeoutSeconds = 30): Promise<boolean> {
    return new Promise((resolve) => {
      this.log(
        LogLevel.INFO,
        "MONITOR",
        `Waiting for ${serviceName} to start on port ${port}...`
      );

      const startTime = Date.now();
      const checkInterval = setInterval(async () => {
        const portInfo = await this.checkPortWithDetails(port);

        if (portInfo.inUse) {
          clearInterval(checkInterval);
          const uptime = ((Date.now() - startTime) / 1000).toFixed(1);

          this.log(
            LogLevel.SUCCESS,
            "MONITOR",
            `${serviceName} is now running on port ${port}`,
            {
              data: {
                startupTime: `${uptime}s`,
                pid: portInfo.process?.pid,
                processName: portInfo.process?.name,
              },
            }
          );

          const serviceKey = serviceName.toLowerCase() as keyof InfrastructureStatus;
          if (this.infrastructureStatus[serviceKey]) {
            this.infrastructureStatus[serviceKey].status = "running";
            this.infrastructureStatus[serviceKey].port = port;
            this.infrastructureStatus[serviceKey].pid = portInfo.process ? parseInt(portInfo.process.pid) : null;
            this.infrastructureStatus[serviceKey].uptime = parseFloat(uptime);
          }

          resolve(true);
        } else if (Date.now() - startTime > timeoutSeconds * 1000) {
          clearInterval(checkInterval);
          this.log(
            LogLevel.ERROR,
            "MONITOR",
            `Timeout waiting for ${serviceName} to start on port ${port}`,
            {
              data: { timeoutSeconds },
            }
          );
          resolve(false);
        }
      }, 1000);
    });
  }

  async checkServiceHealth(port: number, endpoint = "/health"): Promise<HealthCheckResult> {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}${endpoint}`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const healthData = JSON.parse(data);
            resolve({ healthy: res.statusCode === 200, data: healthData });
          } catch (e) {
            resolve({
              healthy: res.statusCode === 200,
              data: { status: "ok" },
            });
          }
        });
      });

      req.on("error", (error) => {
        // If health endpoint fails, try the API endpoint as fallback
        if (endpoint === "/health") {
          this.checkServiceHealth(port, "/api").then(resolve);
        } else {
          resolve({ healthy: false, data: null, error: error.message });
        }
      });

      req.setTimeout(5000, () => {
        req.destroy();
        // If health endpoint times out, try the API endpoint as fallback
        if (endpoint === "/health") {
          this.checkServiceHealth(port, "/api").then(resolve);
        } else {
          resolve({ healthy: false, data: null, error: "Timeout" });
        }
      });
    });
  }

  startInfrastructureMonitoring(intervalSeconds = 30): void {
    if (this.quiet) return;

    setInterval(async () => {
      this.log(
        LogLevel.DEBUG,
        "MONITOR",
        "Running infrastructure health check..."
      );

      if (this.infrastructureStatus.backend.status === "running") {
        const health = await this.checkServiceHealth(
          this.infrastructureStatus.backend.port!
        );
        if (!health.healthy) {
          this.log(LogLevel.WARN, "MONITOR", "Backend health check failed", {
            data: {
              port: this.infrastructureStatus.backend.port,
              error: health.error || "Service not responding",
              endpoint: health.data ? "API endpoint working" : "No response",
            },
          });
        } else {
          this.log(LogLevel.DEBUG, "MONITOR", "Backend health check passed", {
            data: {
              status: health.data?.status || "ok",
              endpoint: "/health",
            },
          });
        }
      }

      if (this.verbose) {
        this.displayInfrastructureDashboard();
      }
    }, intervalSeconds * 1000);
  }

  displaySummary(): void {
    const uptime = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const logStats = this.getLogStatistics();

    this.printSectionHeader("Development Session Summary");

    this.log(LogLevel.SYSTEM, "SUMMARY", `Session completed after ${uptime}s`, {
      data: {
        totalLogs: this.logBuffer.length,
        logsByLevel: logStats,
        services: Object.keys(this.infrastructureStatus).filter(
          (key) => this.infrastructureStatus[key as keyof InfrastructureStatus].status === "running"
        ),
      },
    });
  }

  private getLogStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.logBuffer.forEach((entry) => {
      stats[entry.level] = (stats[entry.level] || 0) + 1;
    });
    return stats;
  }

  integrateServerStatus(serverStatusData: ServerStatusData): void {
    if (!serverStatusData || this.quiet) return;

    try {
      const { infrastructure, server } = serverStatusData;

      this.log(
        LogLevel.INFO,
        "INTEGRATION",
        "Received server infrastructure status",
        {
          data: {
            serverUptime: server?.uptime,
            serverPid: server?.pid,
            databaseConnected: infrastructure?.database?.connected,
            activeConnections: infrastructure?.database?.activeConnections,
            websocketClients: infrastructure?.websocket?.clients,
            cacheHits: infrastructure?.cache?.hits,
            servicesActive: Object.keys(infrastructure?.services || {}).filter(
              (key) => infrastructure!.services![key]?.active
            ).length,
          },
        }
      );

      // Update our infrastructure status with server data
      if (infrastructure?.database?.connected) {
        this.infrastructureStatus.database.status = "connected";
        this.infrastructureStatus.database.connections =
          infrastructure.database.activeConnections || 0;
      }

      // Display integrated status if verbose mode
      if (this.verbose) {
        this.displayIntegratedInfrastructure(serverStatusData);
      }
    } catch (error) {
      this.log(
        LogLevel.WARN,
        "INTEGRATION",
        "Error integrating server status",
        { error: error as Error }
      );
    }
  }

  private displayIntegratedInfrastructure(serverStatusData: ServerStatusData): void {
    if (this.quiet) return;

    console.log("");
    this.printSectionHeader("Integrated Infrastructure Status");

    const { infrastructure, server } = serverStatusData;

    console.log(
      `${colors.brightCyan}🚀 Development Environment:${colors.reset}`
    );
    console.log(
      `   Frontend: ${this.getStatusIndicator(this.infrastructureStatus.frontend.status)} Port ${this.infrastructureStatus.frontend.port || "N/A"}`
    );
    console.log(
      `   Backend: ${this.getStatusIndicator(this.infrastructureStatus.backend.status)} Port ${this.infrastructureStatus.backend.port || "N/A"}`
    );
    console.log("");

    console.log(
      `${colors.brightMagenta}🏗️ Server Infrastructure:${colors.reset}`
    );
    console.log(
      `   Database: ${this.getStatusIndicator(infrastructure?.database?.connected ? "connected" : "stopped")} ${infrastructure?.database?.activeConnections || 0} connections`
    );
    console.log(
      `   Cache: ${this.getStatusIndicator(infrastructure?.cache?.active ? "running" : "stopped")} ${infrastructure?.cache?.hits || 0} hits`
    );
    console.log(
      `   WebSocket: ${this.getStatusIndicator(infrastructure?.websocket?.active ? "running" : "stopped")} ${infrastructure?.websocket?.clients || 0} clients`
    );
    console.log(
      `   Storage: ${this.getStatusIndicator(infrastructure?.storage?.active ? "running" : "stopped")} ${infrastructure?.storage?.path || "N/A"}`
    );
    console.log("");

    if (infrastructure?.services) {
      const activeServices = Object.entries(infrastructure.services)
        .filter(([_, service]) => service?.active)
        .map(([name]) => name);

      console.log(`${colors.brightGreen}⚙️ Active Services:${colors.reset}`);
      if (activeServices.length > 0) {
        activeServices.forEach((service) => {
          console.log(`   • ${service}`);
        });
      } else {
        console.log(
          `   ${colors.gray}No additional services active${colors.reset}`
        );
      }
      console.log("");
    }

    console.log(`${colors.brightYellow}📊 System Info:${colors.reset}`);
    console.log(`   Server Uptime: ${server?.uptime || "N/A"}`);
    console.log(`   Server PID: ${server?.pid || "N/A"}`);
    console.log(
      `   Environment: ${server?.environment || process.env.NODE_ENV || "development"}`
    );
    console.log("");
  }

  private getStatusIndicator(status: ServiceStatus["status"]): string {
    const indicators: Record<ServiceStatus["status"], string> = {
      running: `${colors.green}●${colors.reset}`,
      connected: `${colors.green}●${colors.reset}`,
      starting: `${colors.yellow}●${colors.reset}`,
      checking: `${colors.cyan}●${colors.reset}`,
      error: `${colors.red}●${colors.reset}`,
      stopped: `${colors.gray}●${colors.reset}`,
    };
    return indicators[status] || `${colors.white}●${colors.reset}`;
  }
}

// ==================== Utility Functions ====================

function colorLog(message: string, color: keyof ColorsConfig = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title: string): void {
  console.log("");
  colorLog("=".repeat(60), "magenta");
  colorLog(`  ${title}`, "magenta");
  colorLog("=".repeat(60), "magenta");
  console.log("");
}

function detectOS(): OSInfo {
  const platform = os.platform();

  switch (platform) {
    case "win32":
      return {
        name: "Windows",
        platform: "windows",
        shell: "cmd",
        scriptExt: ".bat",
        killCommand: "taskkill",
        netstatCommand: "netstat -ano",
      };
    case "darwin":
      return {
        name: "macOS",
        platform: "macos",
        shell: "bash",
        scriptExt: ".sh",
        killCommand: "kill",
        netstatCommand: "netstat -an",
      };
    case "linux":
      return {
        name: "Linux",
        platform: "linux",
        shell: "bash",
        scriptExt: ".sh",
        killCommand: "kill",
        netstatCommand: "netstat -tlnp",
      };
    default:
      return {
        name: "Unknown",
        platform: "unknown",
        shell: "bash",
        scriptExt: ".sh",
        killCommand: "kill",
        netstatCommand: "netstat -an",
      };
  }
}

function checkPort(port: number): boolean {
  try {
    const osInfo = detectOS();
    let output: string;

    if (osInfo.platform === "windows") {
      output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        stdio: "pipe",
      });
      return output.includes("LISTENING");
    } else {
      try {
        execSync(`lsof -i :${port}`, { stdio: "pipe" });
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}

function killProcessOnPort(port: number): void {
  try {
    const osInfo = detectOS();

    if (osInfo.platform === "windows") {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        stdio: "pipe",
      });
      const lines = output
        .split("\n")
        .filter((line) => line.includes("LISTENING"));

      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(Number(pid))) {
          try {
            execSync(`taskkill /f /pid ${pid}`, { stdio: "ignore" });
            colorLog(`✓ Killed process ${pid} on port ${port}`, "green");
          } catch (e) {
            colorLog(`✗ Failed to kill process ${pid} on port ${port}`, "red");
          }
        }
      });
    } else {
      try {
        const output = execSync(`lsof -ti :${port}`, {
          encoding: "utf8",
          stdio: "pipe",
        });
        const pids = output
          .trim()
          .split("\n")
          .filter((pid) => pid);

        pids.forEach((pid) => {
          try {
            execSync(`kill -9 ${pid}`, { stdio: "ignore" });
            colorLog(`✓ Killed process ${pid} on port ${port}`, "green");
          } catch (e) {
            colorLog(`✗ Failed to kill process ${pid} on port ${port}`, "red");
          }
        });
      } catch {
        colorLog(`✓ No processes found on port ${port}`, "green");
      }
    }
  } catch (error) {
    colorLog(`✓ Port ${port} appears to be free`, "green");
  }
}

function checkPostgreSQL(): boolean {
  const isRunning = checkPort(PORTS.POSTGRES);
  if (isRunning) {
    colorLog(`✓ PostgreSQL is running on port ${PORTS.POSTGRES}`, "green");
    return true;
  } else {
    colorLog(`⚠ PostgreSQL not detected on port ${PORTS.POSTGRES}`, "yellow");
    colorLog(
      "  Please ensure PostgreSQL is running before continuing.",
      "yellow"
    );
    return false;
  }
}

function waitForPort(port: number, serviceName: string, timeoutSeconds = 30): Promise<boolean> {
  return new Promise((resolve) => {
    colorLog(`Waiting for ${serviceName} to start on port ${port}...`, "cyan");

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (checkPort(port)) {
        clearInterval(checkInterval);
        colorLog(`✓ ${serviceName} is now running on port ${port}`, "green");
        resolve(true);
      } else if (Date.now() - startTime > timeoutSeconds * 1000) {
        clearInterval(checkInterval);
        colorLog(
          `✗ Timeout waiting for ${serviceName} to start on port ${port}`,
          "red"
        );
        resolve(false);
      }
    }, 1000);
  });
}

function runPlatformSpecificScript(osInfo: OSInfo, args: string[] = []): boolean {
  const scriptPath = path.join(__dirname, `start-dev${osInfo.scriptExt}`);

  if (fs.existsSync(scriptPath)) {
    colorLog(`Found platform-specific script: ${scriptPath}`, "cyan");
    colorLog("Delegating to platform-specific implementation...", "cyan");

    try {
      if (osInfo.platform === "windows") {
        // Use cmd /c to execute the batch file properly
        execSync(`cmd /c "${scriptPath}" ${args.join(" ")}`, {
          stdio: "inherit",
          cwd: process.cwd(),
          timeout: 60000, // 60 second timeout
        });
      } else {
        execSync(
          `chmod +x "${scriptPath}" && "${scriptPath}" ${args.join(" ")}`,
          {
            stdio: "inherit",
            cwd: process.cwd(),
            timeout: 60000, // 60 second timeout
          }
        );
      }
      return true;
    } catch (error) {
      const err = error as Error & { code?: number; signal?: string };
      colorLog(`Platform-specific script failed: ${err.message}`, "red");
      if (err.code) {
        colorLog(`Exit code: ${err.code}`, "yellow");
      }
      if (err.signal) {
        colorLog(`Signal: ${err.signal}`, "yellow");
      }
      colorLog("Falling back to Node.js implementation...", "yellow");
      return false;
    }
  }

  return false;
}

async function startDevelopmentEnvironment(options: StartupOptions = {}): Promise<void> {
  const logger = new EnhancedLogger(options);
  const osInfo = detectOS();

  logger.displaySystemInfo();
  logger.printSectionHeader("ABE Stack Enhanced Development Environment");

  // Check if we're in the right directory
  if (!fs.existsSync("package.json")) {
    logger.log(
      LogLevel.ERROR,
      "SYSTEM",
      "package.json not found. Please run this script from the project root directory."
    );
    process.exit(1);
  }

  // Verify this is the ABE Stack project
  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    if (packageJson.name !== "abe-stack") {
      logger.log(
        LogLevel.WARN,
        "SYSTEM",
        `Project name mismatch: ${packageJson.name}`
      );
      if (!options.force) {
        logger.log(
          LogLevel.ERROR,
          "SYSTEM",
          "Use --force to continue with non-ABE Stack project"
        );
        process.exit(1);
      }
    }
    logger.log(LogLevel.SUCCESS, "SYSTEM", "Environment validation passed");
  } catch (error) {
    logger.log(LogLevel.ERROR, "SYSTEM", "Error reading package.json", {
      error: error as Error,
    });
    process.exit(1);
  }

  // Try to run platform-specific script first
  if (
    !options.nodeOnly &&
    runPlatformSpecificScript(osInfo, process.argv.slice(2))
  ) {
    return;
  }

  logger.printSectionHeader("Port Cleanup");
  logger.log(LogLevel.INFO, "SYSTEM", "Cleaning up ports...");
  await logger.killProcessOnPortEnhanced(PORTS.BACKEND);
  await logger.killProcessOnPortEnhanced(PORTS.FRONTEND);

  logger.printSectionHeader("Database Check");
  const dbInfo = await logger.checkPortWithDetails(PORTS.POSTGRES);

  if (dbInfo.inUse) {
    logger.log(
      LogLevel.SUCCESS,
      "DATABASE",
      `PostgreSQL is running on port ${PORTS.POSTGRES}`,
      {
        data: {
          pid: dbInfo.process?.pid,
          processName: dbInfo.process?.name,
        },
      }
    );
    logger.infrastructureStatus.database.status = "connected";
  } else {
    logger.log(
      LogLevel.WARN,
      "DATABASE",
      `PostgreSQL not detected on port ${PORTS.POSTGRES}`
    );
    if (!options.force) {
      logger.log(
        LogLevel.ERROR,
        "SYSTEM",
        "PostgreSQL is required. Use --force to continue anyway."
      );
      process.exit(1);
    }
  }

  logger.printSectionHeader("Starting Development Servers");

  const npmCommand = osInfo.platform === "windows" ? "npm.cmd" : "npm";
  const processes = new Map<string, ChildProcess>();

  // Start backend server
  logger.log(LogLevel.INFO, "BACKEND", "Starting backend service...");
  const backendProcess = spawn(npmCommand, ["run", "dev:server"], {
    stdio: "pipe",
    cwd: process.cwd(),
    shell: osInfo.platform === "windows",
  });

  processes.set("backend", backendProcess);

  backendProcess.stdout?.on("data", (data: Buffer) => {
    if (!options.quiet) {
      logger.parseServerOutput(data, "BACKEND");
    }
  });

  backendProcess.stderr?.on("data", (data: Buffer) => {
    if (!options.quiet) {
      logger.parseServerOutput(data, "BACKEND");
    }
  });

  const backendStarted = await logger.monitorService(
    "Backend",
    PORTS.BACKEND,
    15
  );
  if (!backendStarted) {
    logger.log(LogLevel.ERROR, "SYSTEM", "Failed to start backend server");
    backendProcess.kill();
    process.exit(1);
  }

  // Start frontend server
  logger.log(LogLevel.INFO, "FRONTEND", "Starting frontend service...");
  const frontendProcess = spawn(npmCommand, ["run", "dev:client"], {
    stdio: "pipe",
    cwd: process.cwd(),
    shell: osInfo.platform === "windows",
  });

  processes.set("frontend", frontendProcess);

  frontendProcess.stdout?.on("data", (data: Buffer) => {
    if (!options.quiet) {
      logger.parseServerOutput(data, "FRONTEND");
    }
  });

  frontendProcess.stderr?.on("data", (data: Buffer) => {
    if (!options.quiet) {
      logger.parseServerOutput(data, "FRONTEND");
    }
  });

  const frontendStarted = await logger.monitorService(
    "Frontend",
    PORTS.FRONTEND,
    15
  );
  if (!frontendStarted) {
    logger.log(LogLevel.ERROR, "SYSTEM", "Failed to start frontend server");
    frontendProcess.kill();
    backendProcess.kill();
    process.exit(1);
  }

  // Start infrastructure monitoring
  logger.startInfrastructureMonitoring();

  // Display final status
  logger.displayInfrastructureDashboard();

  logger.printSectionHeader("Development Environment Ready!");

  const urls = [
    {
      name: "Frontend Application",
      url: `http://localhost:${PORTS.FRONTEND}`,
      color: "brightGreen" as keyof ColorsConfig,
    },
    {
      name: "Backend API",
      url: `http://localhost:${PORTS.BACKEND}/api`,
      color: "brightBlue" as keyof ColorsConfig,
    },
    {
      name: "API Documentation",
      url: `http://localhost:${PORTS.BACKEND}/api/docs`,
      color: "brightCyan" as keyof ColorsConfig,
    },
  ];

  urls.forEach(({ name, url, color }) => {
    console.log(`  ${colors[color]}✓ ${name}:${colors.reset} ${url}`);
  });

  console.log("");
  logger.log(LogLevel.INFO, "SYSTEM", "Press Ctrl+C to stop all services");
  if (options.quiet) {
    logger.log(
      LogLevel.INFO,
      "SYSTEM",
      "Running in quiet mode - server logs are hidden"
    );
  } else {
    logger.log(
      LogLevel.INFO,
      "SYSTEM",
      "Server logs are displayed with enhanced formatting"
    );
  }

  // Handle cleanup on exit
  const cleanup = async (signal: string): Promise<void> => {
    logger.log(LogLevel.WARN, "SYSTEM", `Received ${signal}. Shutting down...`);

    for (const [serviceName, process] of processes) {
      logger.log(LogLevel.INFO, "SYSTEM", `Stopping ${serviceName} service...`);
      process.kill();
    }

    logger.displaySummary();
    process.exit(0);
  };

  process.on("SIGINT", () => cleanup("SIGINT"));
  process.on("SIGTERM", () => cleanup("SIGTERM"));
}

// ==================== Main Execution ====================

function parseArguments(): StartupOptions {
  const args = process.argv.slice(2);
  return {
    force: args.includes("--force"),
    quiet: args.includes("--quiet"),
    verbose: args.includes("--verbose"),
    jsonFormat: args.includes("--json"),
    nodeOnly: args.includes("--node-only"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

// Main execution
if (require.main === module) {
  const options = parseArguments();

  if (options.help) {
    console.log(`
ABE Stack Enhanced Development Environment

Usage: node start-dev.js [options]

Options:
  --force      Skip PostgreSQL check and continue anyway
  --quiet      Minimal output, hide server logs
  --verbose    Show detailed monitoring and health checks
  --json       Output logs in JSON format
  --node-only  Use pure Node.js implementation (skip platform scripts)
  --help, -h   Show this help message

Examples:
  node start-dev.js                    # Normal startup with enhanced logging
  node start-dev.js --verbose          # Detailed monitoring and health checks
  node start-dev.js --quiet            # Minimal output
  node start-dev.js --force --verbose  # Force start with detailed monitoring
  node start-dev.js --json             # JSON formatted logs
`);
    process.exit(0);
  }

  startDevelopmentEnvironment(options).catch((error: Error) => {
    console.error("Fatal error:", error.message);
    process.exit(1);
  });
}
