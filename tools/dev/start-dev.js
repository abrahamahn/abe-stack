#!/usr/bin/env node

/**
 * ABE Stack Cross-Platform Development Environment Startup
 * Enhanced with unified logging and infrastructure monitoring
 */

const { execSync, spawn } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");
const http = require("http");

// Configuration
const PORTS = {
  BACKEND: 8080,
  FRONTEND: 5173,
  POSTGRES: 5432,
};

// Enhanced color palette for better visual organization
const colors = {
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

// Log levels for better categorization
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SUCCESS: 4,
  SYSTEM: 5,
};

// Enhanced logging system
class EnhancedLogger {
  constructor(options = {}) {
    this.quiet = options.quiet || false;
    this.verbose = options.verbose || false;
    this.jsonFormat = options.jsonFormat || false;
    this.startTime = Date.now();
    this.logBuffer = [];
    this.maxBufferSize = 1000;
    this.infrastructureStatus = {
      backend: { status: "starting", port: null, pid: null, uptime: 0 },
      frontend: { status: "starting", port: null, pid: null, uptime: 0 },
      database: { status: "checking", port: PORTS.POSTGRES, connections: 0 },
    };
  }

  log(level, service, message, data = {}) {
    if (this.quiet && level < LogLevel.WARN) return;

    const timestamp = new Date().toISOString();
    const uptime = ((Date.now() - this.startTime) / 1000).toFixed(1);

    const logEntry = {
      timestamp,
      uptime: `${uptime}s`,
      level: Object.keys(LogLevel)[level],
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

  formatConsoleOutput(entry) {
    const { level, service, message, uptime } = entry;

    const serviceColors = {
      SYSTEM: colors.brightMagenta,
      BACKEND: colors.brightCyan,
      FRONTEND: colors.brightGreen,
      DATABASE: colors.brightBlue,
      INFRASTRUCTURE: colors.brightYellow,
      MONITOR: colors.cyan,
    };

    const levelFormats = {
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

  formatStructuredData(data, indent = "") {
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
          this.formatStructuredData(value, indent + "  ");
        }
      } else {
        console.log(
          `${indent}${colors.cyan}${key}:${colors.reset} ${this.formatValue(value)}`
        );
      }
    });
  }

  formatValue(value) {
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

  formatError(error, indent = "") {
    if (typeof error === "string") {
      console.log(`${indent}${colors.red}Error: ${error}${colors.reset}`);
      return;
    }

    if (error.message) {
      console.log(
        `${indent}${colors.red}Error: ${error.message}${colors.reset}`
      );
    }

    if (error.code) {
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

  // Enhanced JSON parsing with error handling
  parseServerOutput(data, service) {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());

    lines.forEach((line) => {
      try {
        if (line.trim().startsWith("{") && line.trim().endsWith("}")) {
          const parsed = JSON.parse(line);
          this.handleStructuredLog(parsed, service);
        } else {
          this.handlePlainTextLog(line, service);
        }
      } catch (error) {
        this.handlePlainTextLog(line, service);
      }
    });
  }

  handleStructuredLog(logData, service) {
    const level = this.mapLogLevel(logData.level || logData.severity || "info");
    const message = logData.message || logData.msg || "Structured log entry";

    const metadata = {
      ...(logData.timestamp && { timestamp: logData.timestamp }),
      ...(logData.correlationId && { correlationId: logData.correlationId }),
      ...(logData.context && { context: logData.context }),
      ...(logData.metadata && { metadata: logData.metadata }),
    };

    this.log(level, service, message, { data: metadata });
    this.updateInfrastructureStatus(logData, service);
  }

  handlePlainTextLog(line, service) {
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
    let detectedInfo = {};

    if (patterns.error.test(trimmedLine)) level = LogLevel.ERROR;
    else if (patterns.warn.test(trimmedLine)) level = LogLevel.WARN;
    else if (patterns.success.test(trimmedLine)) level = LogLevel.SUCCESS;

    const portMatch = trimmedLine.match(patterns.port);
    if (portMatch) {
      detectedInfo.port = parseInt(portMatch[1]);
      this.updateServicePort(service, detectedInfo.port);
    }

    const cleanMessage = trimmedLine
      .replace(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]\s*/, "")
      .replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s*/, "")
      .replace(/^(INFO|WARN|ERROR|DEBUG)\s*:?\s*/i, "");

    this.log(level, service, cleanMessage, detectedInfo);
  }

  mapLogLevel(levelString) {
    const levelMap = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      warning: LogLevel.WARN,
      error: LogLevel.ERROR,
      success: LogLevel.SUCCESS,
    };
    return levelMap[levelString.toLowerCase()] || LogLevel.INFO;
  }

  updateServicePort(service, port) {
    const serviceKey = service.toLowerCase();
    if (this.infrastructureStatus[serviceKey]) {
      this.infrastructureStatus[serviceKey].port = port;
      this.infrastructureStatus[serviceKey].status = "running";
    }
  }

  updateInfrastructureStatus(logData, service) {
    if (logData.service === "database" || service === "DATABASE") {
      if (logData.connected || logData.status === "connected") {
        this.infrastructureStatus.database.status = "connected";
      }
      if (logData.connections) {
        this.infrastructureStatus.database.connections = logData.connections;
      }
    }
  }

  // Infrastructure monitoring dashboard
  displayInfrastructureDashboard() {
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
      if (status.connections) details += ` Connections: ${status.connections}`;
      if (status.uptime) details += ` Uptime: ${status.uptime}s`;

      const line = `│ ${serviceName.padEnd(12)} │ ${statusColor}${statusText.padEnd(12)}${colors.reset} │ ${details.padEnd(30)} │`;
      console.log(line);
    });

    console.log(bottom);
    console.log("");
  }

  getStatusColor(status) {
    const statusColors = {
      starting: colors.yellow,
      running: colors.green,
      connected: colors.green,
      checking: colors.cyan,
      error: colors.red,
      stopped: colors.gray,
    };
    return statusColors[status] || colors.white;
  }

  printSectionHeader(title) {
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

  displaySystemInfo() {
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

  async checkPortWithDetails(port) {
    try {
      const osInfo = detectOS();
      let processInfo = null;

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

  async killProcessOnPortEnhanced(port) {
    const portInfo = await this.checkPortWithDetails(port);

    if (!portInfo.inUse) {
      this.log(LogLevel.SUCCESS, "SYSTEM", `Port ${port} is already free`);
      return true;
    }

    this.log(LogLevel.WARN, "SYSTEM", `Killing process on port ${port}`, {
      data: {
        pid: portInfo.process.pid,
        processName: portInfo.process.name,
      },
    });

    try {
      const osInfo = detectOS();

      if (osInfo.platform === "windows") {
        execSync(`taskkill /f /pid ${portInfo.process.pid}`, {
          stdio: "ignore",
        });
      } else {
        execSync(`kill -9 ${portInfo.process.pid}`, { stdio: "ignore" });
      }

      this.log(
        LogLevel.SUCCESS,
        "SYSTEM",
        `Successfully killed process ${portInfo.process.pid} on port ${port}`
      );
      return true;
    } catch (error) {
      this.log(
        LogLevel.ERROR,
        "SYSTEM",
        `Failed to kill process on port ${port}`,
        { error }
      );
      return false;
    }
  }

  async monitorService(serviceName, port, timeoutSeconds = 30) {
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

          const serviceKey = serviceName.toLowerCase();
          if (this.infrastructureStatus[serviceKey]) {
            this.infrastructureStatus[serviceKey].status = "running";
            this.infrastructureStatus[serviceKey].port = port;
            this.infrastructureStatus[serviceKey].pid = portInfo.process?.pid;
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

  async checkServiceHealth(port, endpoint = "/health") {
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

  startInfrastructureMonitoring(intervalSeconds = 30) {
    if (this.quiet) return;

    setInterval(async () => {
      this.log(
        LogLevel.DEBUG,
        "MONITOR",
        "Running infrastructure health check..."
      );

      if (this.infrastructureStatus.backend.status === "running") {
        const health = await this.checkServiceHealth(
          this.infrastructureStatus.backend.port
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

  displaySummary() {
    const uptime = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const logStats = this.getLogStatistics();

    this.printSectionHeader("Development Session Summary");

    this.log(LogLevel.SYSTEM, "SUMMARY", `Session completed after ${uptime}s`, {
      data: {
        totalLogs: this.logBuffer.length,
        logsByLevel: logStats,
        services: Object.keys(this.infrastructureStatus).filter(
          (key) => this.infrastructureStatus[key].status === "running"
        ),
      },
    });
  }

  getLogStatistics() {
    const stats = {};
    this.logBuffer.forEach((entry) => {
      stats[entry.level] = (stats[entry.level] || 0) + 1;
    });
    return stats;
  }

  /**
   * Integration method to consume server infrastructure status
   * This allows the dev environment to display server-side infrastructure info
   */
  integrateServerStatus(serverStatusData) {
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
              (key) => infrastructure.services[key]?.active
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
        { error }
      );
    }
  }

  /**
   * Display integrated infrastructure status combining dev environment and server data
   */
  displayIntegratedInfrastructure(serverStatusData) {
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
      `   Database: ${this.getStatusIndicator(infrastructure?.database?.connected ? "connected" : "disconnected")} ${infrastructure?.database?.activeConnections || 0} connections`
    );
    console.log(
      `   Cache: ${this.getStatusIndicator(infrastructure?.cache?.active ? "active" : "inactive")} ${infrastructure?.cache?.hits || 0} hits`
    );
    console.log(
      `   WebSocket: ${this.getStatusIndicator(infrastructure?.websocket?.active ? "active" : "inactive")} ${infrastructure?.websocket?.clients || 0} clients`
    );
    console.log(
      `   Storage: ${this.getStatusIndicator(infrastructure?.storage?.active ? "active" : "inactive")} ${infrastructure?.storage?.path || "N/A"}`
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

  getStatusIndicator(status) {
    const indicators = {
      running: `${colors.green}●${colors.reset}`,
      connected: `${colors.green}●${colors.reset}`,
      active: `${colors.green}●${colors.reset}`,
      starting: `${colors.yellow}●${colors.reset}`,
      checking: `${colors.cyan}●${colors.reset}`,
      error: `${colors.red}●${colors.reset}`,
      stopped: `${colors.gray}●${colors.reset}`,
      disconnected: `${colors.red}●${colors.reset}`,
      inactive: `${colors.gray}●${colors.reset}`,
    };
    return indicators[status] || `${colors.white}●${colors.reset}`;
  }
}

function colorLog(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
  console.log("");
  colorLog("=".repeat(60), "magenta");
  colorLog(`  ${title}`, "magenta");
  colorLog("=".repeat(60), "magenta");
  console.log("");
}

function detectOS() {
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

function checkPort(port) {
  try {
    const osInfo = detectOS();
    let output;

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

function killProcessOnPort(port) {
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
        if (pid && !isNaN(pid)) {
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

function checkPostgreSQL() {
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

function waitForPort(port, serviceName, timeoutSeconds = 30) {
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

function runPlatformSpecificScript(osInfo, args = []) {
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
      colorLog(`Platform-specific script failed: ${error.message}`, "red");
      if (error.code) {
        colorLog(`Exit code: ${error.code}`, "yellow");
      }
      if (error.signal) {
        colorLog(`Signal: ${error.signal}`, "yellow");
      }
      colorLog("Falling back to Node.js implementation...", "yellow");
      return false;
    }
  }

  return false;
}

async function startDevelopmentEnvironment(options = {}) {
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
      error,
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
  const processes = new Map();

  // Start backend server
  logger.log(LogLevel.INFO, "BACKEND", "Starting backend service...");
  const backendProcess = spawn(npmCommand, ["run", "dev:server"], {
    stdio: "pipe",
    cwd: process.cwd(),
    shell: osInfo.platform === "windows",
  });

  processes.set("backend", backendProcess);

  backendProcess.stdout.on("data", (data) => {
    if (!options.quiet) {
      logger.parseServerOutput(data, "BACKEND");
    }
  });

  backendProcess.stderr.on("data", (data) => {
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

  frontendProcess.stdout.on("data", (data) => {
    if (!options.quiet) {
      logger.parseServerOutput(data, "FRONTEND");
    }
  });

  frontendProcess.stderr.on("data", (data) => {
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
      color: "brightGreen",
    },
    {
      name: "Backend API",
      url: `http://localhost:${PORTS.BACKEND}/api`,
      color: "brightBlue",
    },
    {
      name: "API Documentation",
      url: `http://localhost:${PORTS.BACKEND}/api/docs`,
      color: "brightCyan",
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
  const cleanup = async (signal) => {
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

// Parse command line arguments
function parseArguments() {
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

  startDevelopmentEnvironment(options).catch((error) => {
    console.error("Fatal error:", error.message);
    process.exit(1);
  });
}
