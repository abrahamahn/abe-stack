/**
 * Request utilities for extracting client information.
 *
 * @module utils/request
 */
/**
 * Extracted request information for logging and security.
 */
export interface RequestInfo {
    /** Client IP address (may be undefined if not available) */
    ipAddress: string | undefined;
    /** Client user agent string (may be undefined if not available) */
    userAgent: string | undefined;
}
/**
 * Minimal interface for requests that support IP and user-agent extraction.
 * This allows handlers to use the abstract RequestWithCookies type while
 * still being able to extract request info without unsafe casts.
 */
export interface RequestWithClientInfo {
    /** Client IP address (may be from X-Forwarded-For if trustProxy is enabled) */
    ip?: string;
    /** HTTP headers */
    headers: {
        'user-agent'?: string;
        [key: string]: string | string[] | undefined;
    };
}
/**
 * Extract request information for logging and security.
 *
 * @param request - Request with client info
 * @returns Extracted request info (IP and user agent)
 * @complexity O(1)
 */
export declare function extractRequestInfo(request: RequestWithClientInfo): RequestInfo;
//# sourceMappingURL=request.d.ts.map