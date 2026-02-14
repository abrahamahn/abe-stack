// main/tools/scripts/dev/logger.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isTurboSummaryLine, logLine, normalizeServerLine } from './logger';

describe('dev logger helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeServerLine', () => {
    it('normalizes EnvLoader lines to env scope', () => {
      const out = normalizeServerLine('[EnvLoader] Loading stage: development');
      expect(out).toEqual({
        handled: true,
        scope: 'env',
        level: 'info',
        message: 'Loading stage: development',
      });
    });

    it('normalizes bracketed server status lines', () => {
      const out = normalizeServerLine('[16:02:11] WARN  Server listening on http://0.0.0.0:8080');
      expect(out).toEqual({
        handled: true,
        scope: 'server',
        level: 'warn',
        time: '16:02:11',
        message: 'Server listening on http://0.0.0.0:8080',
      });
    });

    it('maps bracketed HTTP marker line to readable label', () => {
      const out = normalizeServerLine('[16:02:25] INFO  |');
      expect(out).toEqual({
        handled: true,
        scope: 'server',
        level: 'info',
        time: '16:02:25',
        message: 'HTTP request log',
      });
    });

    it('passes through JSON body lines unchanged', () => {
      expect(normalizeServerLine('{')).toEqual({ handled: true, passthrough: '{' });
      expect(normalizeServerLine('  "path": "/api/auth/refresh",')).toEqual({
        handled: true,
        passthrough: '  "path": "/api/auth/refresh",',
      });
      expect(normalizeServerLine('}')).toEqual({ handled: true, passthrough: '}' });
    });

    it('defaults unknown server lines to info scoped server message', () => {
      const out = normalizeServerLine('Queue server started');
      expect(out).toEqual({
        handled: true,
        scope: 'server',
        level: 'info',
        message: 'Queue server started',
      });
    });
  });

  describe('isTurboSummaryLine', () => {
    it('detects turbo summary lines', () => {
      expect(isTurboSummaryLine('• turbo 2.8.3')).toBe(true);
      expect(isTurboSummaryLine('Tasks: 2 successful, 2 total')).toBe(true);
      expect(isTurboSummaryLine('Cached: 0 cached, 2 total')).toBe(true);
    });

    it('ignores non-summary lines', () => {
      expect(isTurboSummaryLine('VITE v7.3.1 ready in 284 ms')).toBe(false);
      expect(isTurboSummaryLine('Server listening on http://0.0.0.0:8080')).toBe(false);
    });
  });

  describe('logLine', () => {
    it('renders stable left columns with explicit time', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logLine('server', 'Server listening on http://0.0.0.0:8080', 'warn', '16:02:11');

      const line = String(spy.mock.calls[0]?.[0] ?? '');
      expect(line).toContain('16:02:11');
      expect(line).toContain('WARN ');
      expect(line).toContain('server  ');
      expect(line).toContain('Server listening on http://0.0.0.0:8080');
    });
  });
});
