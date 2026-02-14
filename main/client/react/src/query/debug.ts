// main/client/react/src/query/debug.ts
import { hashQueryKey } from '@abe-stack/client-engine';

import type { QueryKey } from '@abe-stack/client-engine';

export interface RetryDecision {
  retryable: boolean;
  status: number | null;
  reason: string;
}

type QueryDebugType =
  | 'start'
  | 'retry-check'
  | 'retry-wait'
  | 'success'
  | 'failure';

export interface QueryDebugRecord {
  readonly type: QueryDebugType;
  readonly query: string;
  readonly timestampMs: number;
  readonly details: Record<string, unknown>;
}

const DEBUG_STORAGE_KEY = 'ABE_QUERY_DEBUG';
const TRACE_KEY = '__ABE_QUERY_TRACE__';
const TRACE_LIMIT = 500;
const EVENT_NAME = 'abe:query-debug';

function isBrowser(): boolean {
  return typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined';
}

function isLocalDevHost(): boolean {
  if (!isBrowser()) return false;
  const hostname = globalThis.window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getExplicitDebugOverride(): boolean | null {
  if (!isBrowser()) return null;

  const globalFlag = (
    globalThis as unknown as { __ABE_QUERY_DEBUG__?: unknown }
  ).__ABE_QUERY_DEBUG__;
  if (globalFlag === true) return true;
  if (globalFlag === false) return false;

  try {
    const storageFlag = globalThis.localStorage.getItem(DEBUG_STORAGE_KEY);
    if (storageFlag === '1') return true;
    if (storageFlag === '0') return false;
  } catch {
    return null;
  }

  return null;
}

export function shouldDebugQueries(): boolean {
  const override = getExplicitDebugOverride();
  if (override !== null) return override;
  return isLocalDevHost();
}

function toLabel(queryKey: QueryKey): string {
  return `query:${hashQueryKey(queryKey)}`;
}

function emitRecord(record: QueryDebugRecord): void {
  if (!isBrowser()) return;

  const target = globalThis as unknown as {
    [TRACE_KEY]?: QueryDebugRecord[];
    dispatchEvent?: (event: Event) => boolean;
  };

  const current = target[TRACE_KEY] ?? [];
  const next =
    current.length >= TRACE_LIMIT
      ? [...current.slice(current.length - TRACE_LIMIT + 1), record]
      : [...current, record];
  target[TRACE_KEY] = next;

  if (typeof target.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    target.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: record }));
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function logQueryStart(queryKey: QueryKey): number {
  if (!shouldDebugQueries()) return 0;
  const startedAt = nowMs();
  emitRecord({
    type: 'start',
    query: toLabel(queryKey),
    timestampMs: startedAt,
    details: {},
  });
  return startedAt;
}

export function logQueryRetryDecision(
  queryKey: QueryKey,
  attempt: number,
  maxRetries: number,
  decision: RetryDecision,
): void {
  if (!shouldDebugQueries()) return;
  emitRecord({
    type: 'retry-check',
    query: toLabel(queryKey),
    timestampMs: nowMs(),
    details: {
      attempt: attempt + 1,
      maxAttempts: maxRetries + 1,
      status: decision.status,
      retryable: decision.retryable,
      reason: decision.reason,
    },
  });
}

export function logQueryRetryWait(queryKey: QueryKey, delayMs: number): void {
  if (!shouldDebugQueries()) return;
  emitRecord({
    type: 'retry-wait',
    query: toLabel(queryKey),
    timestampMs: nowMs(),
    details: { delayMs },
  });
}

export function logQuerySuccess(queryKey: QueryKey, startedAt: number, attempts: number): void {
  if (!shouldDebugQueries()) return;
  emitRecord({
    type: 'success',
    query: toLabel(queryKey),
    timestampMs: nowMs(),
    details: {
      attempts,
      durationMs: Math.max(0, nowMs() - startedAt),
    },
  });
}

export function logQueryFailure(
  queryKey: QueryKey,
  startedAt: number,
  attempts: number,
  error: unknown,
): void {
  if (!shouldDebugQueries()) return;
  emitRecord({
    type: 'failure',
    query: toLabel(queryKey),
    timestampMs: nowMs(),
    details: {
      attempts,
      durationMs: Math.max(0, nowMs() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    },
  });
}
