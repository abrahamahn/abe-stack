// main/server/core/src/auth/webauthn/routes.ts
/**
 * WebAuthn Routes
 *
 * Route definitions for WebAuthn/Passkey endpoints.
 *
 * @module webauthn/routes
 */

import {
  emptyBodySchema,
  renamePasskeyRequestSchema,
  webauthnLoginOptionsRequestSchema,
  webauthnLoginVerifyRequestSchema,
  webauthnRegisterVerifyRequestSchema,
  type RenamePasskeyRequest,
  type WebauthnLoginOptionsRequest,
  type WebauthnLoginVerifyRequest,
  type WebauthnRegisterVerifyRequest,
} from '@abe-stack/shared';

import {
  protectedRoute,
  publicRoute,
  type HandlerContext,
  type RouteDefinition,
} from '../../../../engine/src';
import {
  handleDeletePasskey,
  handleListPasskeys,
  handleRenamePasskey,
  handleWebauthnLoginOptions,
  handleWebauthnLoginVerify,
  handleWebauthnRegisterOptions,
  handleWebauthnRegisterVerify,
} from '../handlers/webauthn';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { FastifyReply, FastifyRequest } from 'fastify';

function asAppContext(ctx: HandlerContext): AppContext {
  return ctx as unknown as AppContext;
}

/**
 * WebAuthn route entries for inclusion in the auth route map.
 */
export const webauthnRouteEntries: [string, RouteDefinition][] = [
  // Registration
  [
    'auth/webauthn/register/options',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
        return handleWebauthnRegisterOptions(
          asAppContext(ctx),
          undefined,
          req as unknown as RequestWithCookies,
        );
      },
      [],
      emptyBodySchema,
      { summary: 'Generate WebAuthn registration options', tags: ['Auth', 'WebAuthn'] },
    ),
  ],

  [
    'auth/webauthn/register/verify',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleWebauthnRegisterVerify(
          asAppContext(ctx),
          body as WebauthnRegisterVerifyRequest,
          req as unknown as RequestWithCookies,
        );
      },
      [],
      webauthnRegisterVerifyRequestSchema,
      { summary: 'Verify WebAuthn registration', tags: ['Auth', 'WebAuthn'] },
    ),
  ],

  // Authentication
  [
    'auth/webauthn/login/options',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown) => {
        return handleWebauthnLoginOptions(asAppContext(ctx), body as WebauthnLoginOptionsRequest);
      },
      webauthnLoginOptionsRequestSchema,
      { summary: 'Generate WebAuthn authentication options', tags: ['Auth', 'WebAuthn'] },
    ),
  ],

  [
    'auth/webauthn/login/verify',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest, reply: FastifyReply) => {
        return handleWebauthnLoginVerify(
          asAppContext(ctx),
          body as WebauthnLoginVerifyRequest,
          req as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        );
      },
      webauthnLoginVerifyRequestSchema,
      { summary: 'Verify WebAuthn authentication', tags: ['Auth', 'WebAuthn'] },
    ),
  ],

  // Passkey Management
  [
    'users/me/passkeys',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
        return handleListPasskeys(
          asAppContext(ctx),
          undefined,
          req as unknown as RequestWithCookies,
        );
      },
      [],
      undefined,
      { summary: 'List registered passkeys', tags: ['Auth', 'WebAuthn'] },
    ),
  ],

  [
    'users/me/passkeys/:id',
    protectedRoute(
      'PATCH',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleRenamePasskey(
          asAppContext(ctx),
          body as RenamePasskeyRequest,
          req as unknown as RequestWithCookies,
        );
      },
      'user',
      renamePasskeyRequestSchema,
      { summary: 'Rename a passkey', tags: ['Auth', 'WebAuthn'] },
    ),
  ],

  [
    'users/me/passkeys/:id/delete',
    protectedRoute(
      'DELETE',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest) => {
        return handleDeletePasskey(
          asAppContext(ctx),
          undefined,
          req as unknown as RequestWithCookies,
        );
      },
      [],
      emptyBodySchema,
      { summary: 'Delete a passkey', tags: ['Auth', 'WebAuthn'] },
    ),
  ],
];
