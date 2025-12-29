#!/usr/bin/env tsx
import { execSync } from 'node:child_process';

/**
 * Kill process using the specified port
 * Works on Linux, macOS, and WSL
 */
export function killPort(port: number): void {
  try {
    // Try to find the process using the port
    const portStr = String(port);
    const command =
      process.platform === 'win32'
        ? `netstat -ano | findstr :${portStr}`
        : `lsof -ti:${portStr} || fuser ${portStr}/tcp 2>/dev/null || true`;

    const result = execSync(command, { encoding: 'utf-8' }).trim();

    if (!result) {
      console.log(`✓ Port ${portStr} is free`);
      return;
    }

    // Extract PID and kill the process
    if (process.platform === 'win32') {
      // Windows: extract PID from netstat output
      const lines = result.split('\n');
      const pids = new Set<string>();
      for (const line of lines) {
        const match = line.trim().match(/\s+(\d+)\s*$/);
        if (match) {
          pids.add(match[1]);
        }
      }
      for (const pid of pids) {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      }
      console.log(`✓ Killed process(es) using port ${portStr}`);
    } else {
      // Linux/macOS: lsof or fuser returns PIDs directly
      const pids = result.split('\n').filter(Boolean);
      if (pids.length > 0) {
        execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'ignore' });
        console.log(`✓ Killed process(es) using port ${portStr}: ${pids.join(', ')}`);
      }
    }
  } catch {
    // If no process found or already killed, that's fine
    console.log(`✓ Port ${String(port)} is free`);
  }
}

/**
 * Kill multiple ports
 */
export function killPorts(ports: number[]): void {
  console.log(`🧹 Cleaning up ports: ${ports.join(', ')}`);
  for (const port of ports) {
    killPort(port);
  }
  console.log('✅ Port cleanup complete\n');
}

// Allow running directly from command line
if (require.main === module) {
  const ports = process.argv.slice(2).map(Number);
  if (ports.length === 0) {
    console.error('Usage: tsx tools/kill-port.ts <port1> [port2] [port3] ...');
    process.exit(1);
  }
  killPorts(ports);
}
