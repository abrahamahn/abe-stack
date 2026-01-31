// modules/auth/src/handlers/refresh.ts
/**
 * Refresh Handler
 *
 * Handles token refresh using HTTP-only refresh token cookie.
 *
 * @module handlers/refresh
 */
import { mapErrorToHttpResponse } from '@abe-stack/core';
import { sendTokenReuseAlert } from '../security';
import { refreshUserTokens } from '../service';
import { createErrorMapperLogger, ERROR_MESSAGES, REFRESH_COOKIE_NAME } from '../types';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../utils';
/**
 * Handle token refresh.
 * Rotates the refresh token and issues a new access token.
 *
 * @param ctx - Application context
 * @param request - Request with cookies
 * @param reply - Reply with cookie support
 * @returns New tokens or error response
 * @complexity O(1)
 */
export async function handleRefresh(ctx, request, reply) {
    const oldRefreshToken = request.cookies[REFRESH_COOKIE_NAME];
    if (oldRefreshToken === undefined || oldRefreshToken === '') {
        return { status: 401, body: { message: ERROR_MESSAGES.NO_REFRESH_TOKEN } };
    }
    const { ipAddress, userAgent } = request.requestInfo;
    try {
        const result = await refreshUserTokens(ctx.db, ctx.repos, ctx.config.auth, oldRefreshToken, ipAddress, userAgent);
        // Set new refresh token cookie
        setRefreshTokenCookie(reply, result.refreshToken, ctx.config.auth);
        return {
            status: 200,
            body: { token: result.accessToken },
        };
    }
    catch (error) {
        // Use error.name checks instead of instanceof for ESM compatibility
        if (error instanceof Error) {
            // Clear cookie on invalid token before returning error
            if (error.name === 'InvalidTokenError') {
                clearRefreshTokenCookie(reply);
                return { status: 401, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
            }
            // Handle token reuse detection - send security alert email
            if (error.name === 'TokenReuseError') {
                clearRefreshTokenCookie(reply);
                // Extract token reuse properties
                const tokenReuseError = error;
                // Send email alert (fire and forget - don't block the response)
                if (tokenReuseError.email != null && tokenReuseError.email !== '') {
                    sendTokenReuseAlert(ctx.email, ctx.emailTemplates, {
                        email: tokenReuseError.email,
                        ipAddress: tokenReuseError.ipAddress ?? ipAddress,
                        userAgent: tokenReuseError.userAgent ?? userAgent,
                        timestamp: new Date(),
                    }).catch((emailError) => {
                        ctx.log.error({
                            err: emailError instanceof Error ? emailError : new Error(String(emailError)),
                            userId: tokenReuseError.userId,
                            email: tokenReuseError.email,
                        }, 'Failed to send token reuse alert email');
                    });
                }
                return { status: 401, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
            }
        }
        return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
    }
}
//# sourceMappingURL=refresh.js.map