// modules/auth/src/utils/response.ts
/**
 * Authentication response utilities
 *
 * @module utils/response
 */
/**
 * Creates a standardized authentication response object.
 *
 * This encapsulates the common pattern of returning access token,
 * refresh token, and user information after successful authentication.
 *
 * @param accessToken - The JWT access token
 * @param refreshToken - The refresh token
 * @param user - The authenticated user data
 * @returns Standardized authentication response
 * @complexity O(1)
 */
export function createAuthResponse(accessToken, refreshToken, user) {
    const createdAt = typeof user.createdAt === 'string' ? user.createdAt : user.createdAt.toISOString();
    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl ?? null,
            role: user.role,
            createdAt,
        },
    };
}
//# sourceMappingURL=response.js.map