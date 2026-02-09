// src/shared/src/utils/port.ts
/**
 * Port Utilities
 *
 * Generic Node.js utilities for working with network ports.
 * Useful for development servers, desktop apps, and testing.
 */

import net from 'node:net';

import { delay } from './async';

/**
 * Returns an array of unique port numbers, filtering out undefined and duplicate values.
 * @param ports - Array of port numbers (may include undefined values)
 */
export function uniquePorts(ports: Array<number | undefined>): number[] {
  return Array.from(new Set(ports.filter((port): port is number => Number.isFinite(port))));
}

/**
 * Checks if a port is free (not in use) by attempting to bind to it.
 * @param port - The port number to check
 * @param host - The host to bind to (default: '0.0.0.0')
 */
export function isPortFree(port: number, host: string = '0.0.0.0'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.listen({ port, host }, () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}

/**
 * Checks if a port is currently listening (accepting connections).
 * @param port - The port number to check
 * @param host - The host to connect to (default: 'localhost')
 * @param timeout - Connection timeout in milliseconds (default: 500)
 */
export function isPortListening(
  port: number,
  host: string = 'localhost',
  timeout: number = 500,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.once('error', () => {
      resolve(false);
    });

    socket.setTimeout(timeout, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * Picks the first available (free) port from a list of preferred ports.
 * @param preferredPorts - Array of port numbers to try, in order of preference
 * @param host - The host to check availability on (default: '0.0.0.0')
 * @throws Error if no ports are available
 */
export async function pickAvailablePort(
  preferredPorts: Array<number | undefined>,
  host: string = '0.0.0.0',
): Promise<number> {
  for (const port of uniquePorts(preferredPorts)) {
    if (await isPortFree(port, host)) {
      return port;
    }
  }

  const validPorts = uniquePorts(preferredPorts);
  throw new Error(`No available ports found in list: ${validPorts.join(', ')}`);
}

/**
 * Waits for a port to start listening, polling at regular intervals.
 * Returns the first listening port found from the list.
 * @param ports - Array of port numbers to check
 * @param host - The host to check (default: 'localhost')
 * @param maxAttempts - Maximum number of polling attempts (default: 10)
 * @param delayMs - Delay between attempts in milliseconds (default: 300)
 * @returns The first port that is found listening, or the first port in the list as fallback
 */
export async function waitForPort(
  ports: Array<number | undefined>,
  host: string = 'localhost',
  maxAttempts: number = 10,
  delayMs: number = 300,
): Promise<number> {
  const candidates = uniquePorts(ports);
  const first = candidates[0];

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    for (const port of candidates) {
      if (await isPortListening(port, host)) {
        return port;
      }
    }

    await delay(delayMs);
  }

  // Fallback to the first configured port even if we could not detect it.
  // Default matches Vite's secondary dev server port.
  const VITE_FALLBACK_PORT = 5174;
  return first ?? VITE_FALLBACK_PORT;
}
