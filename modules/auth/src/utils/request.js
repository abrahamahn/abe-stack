// modules/auth/src/utils/request.ts
/**
 * Request utilities for extracting client information.
 *
 * @module utils/request
 */
/**
 * Extract IP address from request.
 * Relies on Fastify's built-in IP detection (configured via trustProxy).
 *
 * @param request - Request with client info
 * @returns IP address or undefined
 * @complexity O(1)
 */
function extractIpAddress(request) {
    return request.ip;
}
/**
 * Extract user agent from request headers.
 *
 * @param request - Request with client info
 * @returns User agent string (truncated to 500 chars) or undefined
 * @complexity O(1)
 */
function extractUserAgent(request) {
    const userAgent = request.headers['user-agent'];
    if (typeof userAgent !== 'string' || userAgent === '') {
        return undefined;
    }
    // Limit length to prevent log bloat
    const MAX_USER_AGENT_LENGTH = 500;
    return userAgent.substring(0, MAX_USER_AGENT_LENGTH);
}
/**
 * Extract request information for logging and security.
 *
 * @param request - Request with client info
 * @returns Extracted request info (IP and user agent)
 * @complexity O(1)
 */
export function extractRequestInfo(request) {
    return {
        ipAddress: extractIpAddress(request),
        userAgent: extractUserAgent(request),
    };
}
//# sourceMappingURL=request.js.map