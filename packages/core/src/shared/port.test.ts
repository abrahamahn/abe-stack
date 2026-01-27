// packages/core/src/shared/port.test.ts
import net from 'node:net';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ErrorHandler = (error: Error) => void;
type ConnectHandler = () => void;

const listeners = new Map<string, Set<number>>();

const normalizeHost = (host?: string): string => {
  if (host === undefined || host === '' || host.length === 0) return '0.0.0.0';
  return host === 'localhost' ? '127.0.0.1' : host;
};

const isPortTaken = (port: number, host: string): boolean => {
  for (const [listeningHost, ports] of listeners.entries()) {
    if (!ports.has(port)) continue;
    if (host === listeningHost) return true;
    if (host === '0.0.0.0' || listeningHost === '0.0.0.0') return true;
  }
  return false;
};

const isPortListeningForHost = (port: number, host: string): boolean => {
  const normalizedHost = normalizeHost(host);
  for (const [listeningHost, ports] of listeners.entries()) {
    if (!ports.has(port)) continue;
    if (listeningHost === '0.0.0.0') return true;
    if (listeningHost === normalizedHost) return true;
  }
  return false;
};

vi.mock('node:net', () => {
  const createServer = () => {
    let boundPort: number | null = null;
    let boundHost: string | null = null;
    let errorHandler: ErrorHandler | null = null;

    return {
      listen(
        portOrOptions: number | { port: number; host?: string },
        hostOrCallback?: string | (() => void),
        callback?: () => void,
      ) {
        const resolvedCallback = typeof hostOrCallback === 'function' ? hostOrCallback : callback;
        const host =
          typeof portOrOptions === 'object'
            ? normalizeHost(portOrOptions.host)
            : normalizeHost(typeof hostOrCallback === 'string' ? hostOrCallback : undefined);
        const port = typeof portOrOptions === 'object' ? portOrOptions.port : portOrOptions;

        if (isPortTaken(port, host)) {
          const error = Object.assign(new Error('EADDRINUSE'), { code: 'EADDRINUSE' });
          if (errorHandler !== null) queueMicrotask(() => { errorHandler!(error); });
          return this;
        }

        boundPort = port;
        boundHost = host;
        const ports = listeners.get(host) ?? new Set<number>();
        ports.add(port);
        listeners.set(host, ports);
        if (resolvedCallback !== undefined) queueMicrotask(() => { resolvedCallback(); });
        return this;
      },
      close(cb?: () => void) {
        if (boundPort !== null && boundHost !== null) {
          const ports = listeners.get(boundHost);
          if (ports !== undefined) {
            ports.delete(boundPort);
            if (ports.size === 0) listeners.delete(boundHost);
          }
        }
        boundPort = null;
        boundHost = null;
        if (cb !== undefined) queueMicrotask(() => { cb(); });
        return this;
      },
      once(event: string, handler: ErrorHandler) {
        if (event === 'error') {
          errorHandler = handler;
        }
        return this;
      },
    };
  };

  const createConnection = ({ host, port }: { host: string; port: number }) => {
    let connectHandler: ConnectHandler | null = null;
    let errorHandler: ErrorHandler | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;

    const clearTimeoutIfNeeded = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const socket = {
      once(event: string, handler: ConnectHandler | ErrorHandler) {
        if (event === 'connect') {
          connectHandler = handler as ConnectHandler;
        }
        if (event === 'error') {
          errorHandler = handler as ErrorHandler;
        }
        return socket;
      },
      setTimeout(timeout: number, handler: () => void) {
        timeoutId = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          handler();
        }, timeout);
        return socket;
      },
      end() {
        return socket;
      },
      destroy() {
        return socket;
      },
    };

    queueMicrotask(() => {
      if (resolved) return;
      if (isPortListeningForHost(port, host)) {
        resolved = true;
        clearTimeoutIfNeeded();
        connectHandler?.();
      } else {
        resolved = true;
        clearTimeoutIfNeeded();
        errorHandler?.(new Error('ECONNREFUSED'));
      }
    });

    return socket;
  };

  return {
    default: {
      createServer,
      createConnection,
    },
  };
});

import { isPortFree, isPortListening, pickAvailablePort, uniquePorts, waitForPort } from './port';

describe('uniquePorts', () => {
  describe('filtering duplicates', () => {
    it('should remove duplicate port numbers', () => {
      expect(uniquePorts([3000, 3001, 3000, 3002, 3001])).toEqual([3000, 3001, 3002]);
    });

    it('should return empty array for empty input', () => {
      expect(uniquePorts([])).toEqual([]);
    });

    it('should preserve order of first occurrence', () => {
      expect(uniquePorts([5000, 3000, 4000, 3000])).toEqual([5000, 3000, 4000]);
    });
  });

  describe('filtering undefined', () => {
    it('should filter out undefined values', () => {
      expect(uniquePorts([3000, undefined, 3001, undefined])).toEqual([3000, 3001]);
    });

    it('should return empty array when all values are undefined', () => {
      expect(uniquePorts([undefined, undefined])).toEqual([]);
    });

    it('should handle mixed undefined and duplicates', () => {
      expect(uniquePorts([3000, undefined, 3000, 3001, undefined, 3001])).toEqual([3000, 3001]);
    });
  });

  describe('filtering invalid numbers', () => {
    it('should filter out NaN', () => {
      expect(uniquePorts([3000, NaN, 3001])).toEqual([3000, 3001]);
    });

    it('should filter out Infinity', () => {
      expect(uniquePorts([3000, Infinity, -Infinity, 3001])).toEqual([3000, 3001]);
    });

    it('should keep valid port numbers including zero', () => {
      expect(uniquePorts([0, 80, 443, 8080])).toEqual([0, 80, 443, 8080]);
    });

    it('should keep negative numbers (validation is not its job)', () => {
      // uniquePorts only checks Number.isFinite, not port validity
      expect(uniquePorts([-1, 3000])).toEqual([-1, 3000]);
    });
  });
});

describe('isPortFree', () => {
  let server: net.Server | null = null;

  afterEach(async () => {
    listeners.clear();
    if (server !== null) {
      await new Promise<void>((resolve) => {
        server?.close(() => { resolve(); });
      });
      server = null;
    }
  });

  it('should return true for a free port', async () => {
    // Use a high random port that's likely free
    const port = 49152 + Math.floor(Math.random() * 1000);
    const result = await isPortFree(port);
    expect(result).toBe(true);
  });

  it('should return false for a port in use', async () => {
    const port = 49152 + Math.floor(Math.random() * 1000);

    // Start a server on the port
    server = net.createServer();
    await new Promise<void>((resolve) => {
      server?.listen(port, '0.0.0.0', () => { resolve(); });
    });

    const result = await isPortFree(port);
    expect(result).toBe(false);
  });

  it('should check the specified host', async () => {
    const port = 49152 + Math.floor(Math.random() * 1000);

    // Bind to localhost only
    server = net.createServer();
    await new Promise<void>((resolve) => {
      server?.listen(port, '127.0.0.1', () => { resolve(); });
    });

    // Should be in use on localhost
    const result = await isPortFree(port, '127.0.0.1');
    expect(result).toBe(false);
  });
});

describe('isPortListening', () => {
  let server: net.Server | null = null;

  afterEach(async () => {
    listeners.clear();
    if (server !== null) {
      await new Promise<void>((resolve) => {
        server?.close(() => { resolve(); });
      });
      server = null;
    }
  });

  it('should return true when a server is listening', async () => {
    const port = 49152 + Math.floor(Math.random() * 1000);

    server = net.createServer();
    await new Promise<void>((resolve) => {
      server?.listen(port, 'localhost', () => { resolve(); });
    });

    const result = await isPortListening(port, 'localhost');
    expect(result).toBe(true);
  });

  it('should return false when no server is listening', async () => {
    // Use a high random port that's unlikely to be in use
    const port = 49152 + Math.floor(Math.random() * 1000);
    const result = await isPortListening(port, 'localhost', 100);
    expect(result).toBe(false);
  });

  it('should respect the timeout parameter', async () => {
    const port = 49152 + Math.floor(Math.random() * 1000);
    const start = Date.now();
    await isPortListening(port, 'localhost', 100);
    const elapsed = Date.now() - start;
    // Should timeout within a reasonable time
    expect(elapsed).toBeLessThan(500);
  });
});

describe('pickAvailablePort', () => {
  let server: net.Server | null = null;

  afterEach(async () => {
    listeners.clear();
    if (server !== null) {
      await new Promise<void>((resolve) => {
        server?.close(() => { resolve(); });
      });
      server = null;
    }
  });

  it('should return the first available port', async () => {
    const port1 = 49152 + Math.floor(Math.random() * 1000);
    const port2 = port1 + 1;
    const port3 = port1 + 2;

    const result = await pickAvailablePort([port1, port2, port3]);
    expect(result).toBe(port1);
  });

  it('should skip unavailable ports and return first available', async () => {
    const port1 = 49152 + Math.floor(Math.random() * 1000);
    const port2 = port1 + 1;

    // Occupy the first port
    server = net.createServer();
    await new Promise<void>((resolve) => {
      server?.listen(port1, '0.0.0.0', () => { resolve(); });
    });

    const result = await pickAvailablePort([port1, port2]);
    expect(result).toBe(port2);
  });

  it('should filter out undefined values', async () => {
    const port = 49152 + Math.floor(Math.random() * 1000);
    const result = await pickAvailablePort([undefined, port, undefined]);
    expect(result).toBe(port);
  });

  it('should throw when no ports are available', async () => {
    const port1 = 49152 + Math.floor(Math.random() * 1000);

    // Occupy the only port in the list
    server = net.createServer();
    await new Promise<void>((resolve) => {
      server?.listen(port1, '0.0.0.0', () => { resolve(); });
    });

    await expect(pickAvailablePort([port1])).rejects.toThrow('No available ports found in list');
  });

  it('should throw with descriptive message listing ports', async () => {
    const port1 = 49152 + Math.floor(Math.random() * 1000);
    const port2 = port1 + 1;

    // Occupy both ports
    server = net.createServer();
    await new Promise<void>((resolve) => {
      server?.listen(port1, '0.0.0.0', () => { resolve(); });
    });

    const server2 = net.createServer();
    await new Promise<void>((resolve) => {
      server2.listen(port2, '0.0.0.0', () => { resolve(); });
    });

    try {
      await expect(pickAvailablePort([port1, port2])).rejects.toThrow(
        `No available ports found in list: ${port1}, ${port2}`,
      );
    } finally {
      await new Promise<void>((resolve) => {
        server2.close(() => { resolve(); });
      });
    }
  });

  it('should throw when given only undefined values', async () => {
    await expect(pickAvailablePort([undefined, undefined])).rejects.toThrow(
      'No available ports found in list:',
    );
  });
});

describe('waitForPort', () => {
  let server: net.Server | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    listeners.clear();
    if (server !== null) {
      await new Promise<void>((resolve) => {
        server?.close(() => { resolve(); });
      });
      server = null;
    }
  });

  describe('with real timers', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it('should return immediately when port is already listening', async () => {
      const port = 49152 + Math.floor(Math.random() * 1000);

      server = net.createServer();
      await new Promise<void>((resolve) => {
        server?.listen(port, 'localhost', () => { resolve(); });
      });

      const start = Date.now();
      const result = await waitForPort([port], 'localhost', 5, 50);
      const elapsed = Date.now() - start;

      expect(result).toBe(port);
      expect(elapsed).toBeLessThan(200); // Should be quick since port is already listening
    });

    it('should return first listening port from multiple candidates', async () => {
      const port1 = 49152 + Math.floor(Math.random() * 1000);
      const port2 = port1 + 1;
      const port3 = port1 + 2;

      // Start server on port2 only
      server = net.createServer();
      await new Promise<void>((resolve) => {
        server?.listen(port2, 'localhost', () => { resolve(); });
      });

      const result = await waitForPort([port1, port2, port3], 'localhost', 3, 50);
      expect(result).toBe(port2);
    });

    it('should return fallback when no port starts listening', async () => {
      const port1 = 49152 + Math.floor(Math.random() * 1000);
      const port2 = port1 + 1;

      // Don't start any server
      const result = await waitForPort([port1, port2], 'localhost', 2, 10);

      // Should return the first port as fallback
      expect(result).toBe(port1);
    });

    it('should return default fallback 5174 when given only undefined values', async () => {
      const result = await waitForPort([undefined, undefined], 'localhost', 1, 10);
      expect(result).toBe(5174);
    });

    it('should filter undefined from port list', async () => {
      const port = 49152 + Math.floor(Math.random() * 1000);

      server = net.createServer();
      await new Promise<void>((resolve) => {
        server?.listen(port, 'localhost', () => { resolve(); });
      });

      const result = await waitForPort([undefined, port, undefined], 'localhost', 3, 50);
      expect(result).toBe(port);
    });
  });

  describe('polling behavior', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it('should poll multiple times before returning fallback', async () => {
      const port = 49152 + Math.floor(Math.random() * 1000);
      const maxAttempts = 3;
      const delayMs = 10;

      const start = Date.now();
      await waitForPort([port], 'localhost', maxAttempts, delayMs);
      const elapsed = Date.now() - start;

      // Should have waited for all attempts with delays between them
      // Total time should be at least (maxAttempts - 1) * delayMs
      expect(elapsed).toBeGreaterThanOrEqual((maxAttempts - 1) * delayMs * 0.8);
    });
  });
});
