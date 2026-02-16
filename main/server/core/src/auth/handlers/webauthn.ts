// main/server/core/src/auth/handlers/webauthn.ts
/**
 * WebAuthn Handlers
 *
 * HTTP layer for WebAuthn registration, authentication, and passkey management.
 *
 * @module handlers/webauthn
 */

import {
  mapErrorToHttpResponse,
  type HttpErrorResponse,
  type PasskeyListItem,
  type RenamePasskeyRequest,
} from '@abe-stack/shared';

import { withTransaction } from '../../../../db/src';
import { assertUserActive } from '../middleware';
import {
  createErrorMapperLogger,
  type AppContext,
  type ReplyWithCookies,
  type RequestWithCookies,
} from '../types';
import {
  createAccessToken,
  createAuthResponse,
  createRefreshTokenFamily,
  setRefreshTokenCookie,
} from '../utils';
import {
  getAuthenticationOptions,
  getRegistrationOptions,
  verifyAuthentication,
  verifyRegistration,
} from '../webauthn/service';

// ============================================================================
// Registration Handlers
// ============================================================================

/**
 * Generate WebAuthn registration options (protected).
 */
export async function handleWebauthnRegisterOptions(
  ctx: AppContext,
  _body: unknown,
  request: RequestWithCookies,
): Promise<{ status: 200; body: { options: Record<string, unknown> } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: 'Authentication required' } };
    }

    await assertUserActive((id) => ctx.repos.users.findById(id), userId);

    const email = request.user?.email ?? '';
    const options = await getRegistrationOptions(ctx.repos, userId, email, ctx.config.auth);

    return { status: 200, body: { options } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Verify WebAuthn registration response (protected).
 */
export async function handleWebauthnRegisterVerify(
  ctx: AppContext,
  body: { credential: Record<string, unknown>; name?: string },
  request: RequestWithCookies,
): Promise<{ status: 200; body: { credentialId: string; message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: 'Authentication required' } };
    }

    await assertUserActive((id) => ctx.repos.users.findById(id), userId);

    const result = await verifyRegistration(
      ctx.repos,
      userId,
      body.credential,
      ctx.config.auth,
      body.name,
    );

    return { status: 200, body: result };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

// ============================================================================
// Authentication Handlers
// ============================================================================

/**
 * Generate WebAuthn authentication options (public).
 */
export async function handleWebauthnLoginOptions(
  ctx: AppContext,
  body: { email?: string },
): Promise<{ status: 200; body: { options: Record<string, unknown> } } | HttpErrorResponse> {
  try {
    const { options } = await getAuthenticationOptions(ctx.repos, ctx.config.auth, body.email);
    return { status: 200, body: { options } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Verify WebAuthn authentication response (public).
 * Issues auth tokens on success.
 */
export async function handleWebauthnLoginVerify(
  ctx: AppContext,
  body: { credential: Record<string, unknown>; sessionKey: string },
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  { status: 200; body: { token: string; user: Record<string, unknown> } } | HttpErrorResponse
> {
  try {
    const { userId } = await verifyAuthentication(
      ctx.repos,
      body.credential,
      body.sessionKey,
      ctx.config.auth,
    );

    const user = await ctx.repos.users.findById(userId);
    if (user === null) {
      return { status: 401, body: { message: 'User not found' } };
    }

    // Check user is active
    await assertUserActive((id) => ctx.repos.users.findById(id), userId);

    const { ipAddress, userAgent } = request.requestInfo;

    // Create tokens
    const { token: refreshToken } = await withTransaction(ctx.db, async (tx) => {
      const sessionMeta: { ipAddress?: string; userAgent?: string } = { ipAddress };
      if (userAgent !== undefined) {
        sessionMeta.userAgent = userAgent;
      }
      return createRefreshTokenFamily(
        tx,
        user.id,
        ctx.config.auth.refreshToken.expiryDays,
        sessionMeta,
      );
    });

    const accessToken = createAccessToken(
      user.id,
      user.email,
      user.role,
      ctx.config.auth.jwt.secret,
      ctx.config.auth.jwt.accessTokenExpiry,
    );

    setRefreshTokenCookie(reply, refreshToken, ctx.config.auth);

    const authResponse = createAuthResponse(accessToken, refreshToken, user);

    return {
      status: 200,
      body: {
        token: authResponse.accessToken,
        user: authResponse.user as unknown as Record<string, unknown>,
      },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

// ============================================================================
// Passkey Management Handlers
// ============================================================================

/**
 * List user's registered passkeys (protected).
 */
export async function handleListPasskeys(
  ctx: AppContext,
  _body: unknown,
  request: RequestWithCookies,
): Promise<{ status: 200; body: PasskeyListItem[] } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: 'Authentication required' } };
    }

    const credentials = await ctx.repos.webauthnCredentials.findByUserId(userId);
    const passkeys: PasskeyListItem[] = credentials.map((c) => ({
      id: c.id,
      name: c.name,
      deviceType: c.deviceType,
      backedUp: c.backedUp,
      createdAt: c.createdAt.toISOString(),
      lastUsedAt: c.lastUsedAt !== null ? c.lastUsedAt.toISOString() : null,
    }));

    return { status: 200, body: passkeys };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Rename a passkey (protected).
 */
export async function handleRenamePasskey(
  ctx: AppContext,
  body: RenamePasskeyRequest,
  request: RequestWithCookies,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: 'Authentication required' } };
    }

    // Verify credential belongs to user
    const params = (request as unknown as { params: { id: string } }).params;
    const credentials = await ctx.repos.webauthnCredentials.findByUserId(userId);
    const credential = credentials.find((c) => c.id === params.id);
    if (credential === undefined) {
      return { status: 404, body: { message: 'Passkey not found' } };
    }

    await ctx.repos.webauthnCredentials.updateName(params.id, body.name);

    return { status: 200, body: { message: 'Passkey renamed successfully' } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Delete a passkey (protected, requires sudo).
 */
export async function handleDeletePasskey(
  ctx: AppContext,
  _body: unknown,
  request: RequestWithCookies,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: 'Authentication required' } };
    }

    // Verify credential belongs to user
    const params = (request as unknown as { params: { id: string } }).params;
    const credentials = await ctx.repos.webauthnCredentials.findByUserId(userId);
    const credential = credentials.find((c) => c.id === params.id);
    if (credential === undefined) {
      return { status: 404, body: { message: 'Passkey not found' } };
    }

    await ctx.repos.webauthnCredentials.delete(params.id);

    return { status: 200, body: { message: 'Passkey deleted successfully' } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
