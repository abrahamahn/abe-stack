// main/server/system/src/errors/reply.test.ts
/**
 * Reply Helpers — Adversarial Unit Tests
 *
 * Risk assessment:
 *  1. 5xx errors must never expose the raw message in the response body
 *     (expose=false), even if the caller forgets to redact.
 *  2. A Result<T, Error> (non-AppError) must be normalised without crashing.
 *  3. Concurrent calls must not share reply state.
 */

import {
  AccountLockedError,
  BadRequestError,
  err,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  ok,
  TooManyRequestsError,
  UnauthorizedError,
} from '@bslt/shared';
import { describe, expect, test, vi, type Mock } from 'vitest';

import { replyError, replyOk, sendResult } from './reply';

import type { HttpReply, HttpRequest } from '../routing/http.types';
import type { AppError } from '@bslt/shared';

// ============================================================================
// Helpers
// ============================================================================

function makeSend() {
  const send = vi.fn();
  const status = vi.fn().mockReturnValue({ send });
  const reply = { status } as unknown as HttpReply;
  return { reply, status, send };
}

function makeRequest(correlationId = 'corr-123'): HttpRequest {
  return { correlationId } as unknown as HttpRequest;
}

// ============================================================================
// replyOk
// ============================================================================

describe('replyOk', () => {
  test('sends { ok: true, data } at status 200 by default', () => {
    const { reply, status, send } = makeSend();
    replyOk(reply, { id: '1' });
    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith({ ok: true, data: { id: '1' } });
  });

  test('respects a custom status code', () => {
    const { reply, status } = makeSend();
    replyOk(reply, { id: '1' }, 201);
    expect(status).toHaveBeenCalledWith(201);
  });

  test('works with null data (empty body)', () => {
    const { reply, send } = makeSend();
    replyOk(reply, null);
    expect(send).toHaveBeenCalledWith({ ok: true, data: null });
  });

  test('works with array data', () => {
    const { reply, send } = makeSend();
    replyOk(reply, [1, 2, 3]);
    expect(send).toHaveBeenCalledWith({ ok: true, data: [1, 2, 3] });
  });
});

// ============================================================================
// replyError
// ============================================================================

describe('replyError', () => {
  test('sends { ok: false, error } at the AppError status', () => {
    const { reply, status, send } = makeSend();
    replyError(reply, new NotFoundError('Missing item'));
    expect(status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  test('includes correlationId when provided', () => {
    const { reply, send } = makeSend();
    replyError(reply, new BadRequestError('Bad'), 'corr-abc');
    const body = (send as Mock).mock.calls[0]![0] as { error: { correlationId: string } };
    expect(body.error.correlationId).toBe('corr-abc');
  });

  test('sets correlationId to undefined when not provided', () => {
    const { reply, send } = makeSend();
    replyError(reply, new BadRequestError('Bad'));
    const body = (send as Mock).mock.calls[0]![0] as { error: { correlationId: unknown } };
    expect(body.error.correlationId).toBeUndefined();
  });

  test('4xx errors expose the original message', () => {
    const { reply, send } = makeSend();
    replyError(reply, new BadRequestError('specific reason'));
    const body = (send as Mock).mock.calls[0]![0] as { error: { message: string } };
    expect(body.error.message).toBe('specific reason');
  });

  test('5xx errors redact the message', () => {
    const { reply, send } = makeSend();
    replyError(reply, new InternalServerError('secret DB error'));
    const body = (send as Mock).mock.calls[0]![0] as { error: { message: string } };
    expect(body.error.message).toBe('Internal server error');
    expect(body.error.message).not.toContain('secret DB error');
  });

  test('includes error code from AppError', () => {
    const { reply, send } = makeSend();
    replyError(reply, new ForbiddenError());
    const body = (send as Mock).mock.calls[0]![0] as { error: { code: string } };
    expect(body.error.code).toBe('FORBIDDEN');
  });

  test('includes retryAfter when present (AccountLockedError)', () => {
    const { reply, send } = makeSend();
    replyError(reply, new AccountLockedError(300));
    const body = (send as Mock).mock.calls[0]![0] as { error: { retryAfter?: number } };
    expect(body.error.retryAfter).toBe(300);
  });

  test('does not include retryAfter when not present', () => {
    const { reply, send } = makeSend();
    replyError(reply, new TooManyRequestsError('rate limited'));
    const body = (send as Mock).mock.calls[0]![0] as { error: { retryAfter?: number } };
    expect(body.error.retryAfter).toBeUndefined();
  });
});

// ============================================================================
// sendResult — Ok branch
// ============================================================================

describe('sendResult — Ok branch', () => {
  test('sends { ok: true, data } at 200 by default', () => {
    const { reply, status, send } = makeSend();
    sendResult(ok({ id: '1' }), reply, makeRequest());
    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith({ ok: true, data: { id: '1' } });
  });

  test('respects a custom success status', () => {
    const { reply, status } = makeSend();
    sendResult(ok({ id: '1' }), reply, makeRequest(), 201);
    expect(status).toHaveBeenCalledWith(201);
  });
});

// ============================================================================
// sendResult — Err branch
// ============================================================================

describe('sendResult — Err branch', () => {
  test('sends error response at AppError status', () => {
    const { reply, status } = makeSend();
    sendResult(err(new NotFoundError('Gone')), reply, makeRequest());
    expect(status).toHaveBeenCalledWith(404);
  });

  test('attaches correlationId from request', () => {
    const { reply, send } = makeSend();
    sendResult(err(new BadRequestError('Bad')), reply, makeRequest('req-xyz'));
    const body = (send as Mock).mock.calls[0]![0] as { error: { correlationId: string } };
    expect(body.error.correlationId).toBe('req-xyz');
  });

  test('redacts 5xx message in response body', () => {
    const { reply, send } = makeSend();
    sendResult(err(new InternalServerError('DB exploded')), reply, makeRequest());
    const body = (send as Mock).mock.calls[0]![0] as { error: { message: string } };
    expect(body.error.message).not.toContain('DB exploded');
    expect(body.error.message).toBe('Internal server error');
  });

  test('normalises a plain Error (non-AppError) without crashing', () => {
    const { reply, status } = makeSend();
    // Result<T, Error> — non-AppError error
    const result = err(new Error('raw error')) as ReturnType<typeof err<AppError>>;
    expect(() => sendResult(result, reply, makeRequest())).not.toThrow();
    expect(status).toHaveBeenCalledWith(500);
  });

  test('401 error exposes original message', () => {
    const { reply, send } = makeSend();
    sendResult(err(new UnauthorizedError('Token expired')), reply, makeRequest());
    const body = (send as Mock).mock.calls[0]![0] as { error: { message: string } };
    expect(body.error.message).toBe('Token expired');
  });
});

// ============================================================================
// Concurrent call isolation
// ============================================================================

describe('concurrent call isolation', () => {
  test('independent calls do not share reply state', () => {
    const call1 = makeSend();
    const call2 = makeSend();
    replyOk(call1.reply, { n: 1 }, 200);
    replyOk(call2.reply, { n: 2 }, 201);
    expect(call1.status).toHaveBeenCalledWith(200);
    expect(call2.status).toHaveBeenCalledWith(201);
    expect(call1.send).not.toBe(call2.send);
  });
});

// Type import used only in test assertion — suppresses lint unused import warning
