// apps/server/src/utils/request-utils.ts
/**
 * Request Utilities
 *
 * Common utility functions for handling requests.
 */

import type { RequestWithCookies } from '@shared/index';

/**
 * Extract a path parameter from the request
 * @param req The request object
 * @param paramName The name of the parameter to extract
 * @returns The parameter value or undefined if not found
 */
export function getPathParam(req: RequestWithCookies, paramName: string): string | undefined {
  const rawReq = req as RequestWithCookies & { params?: Record<string, string> };
  return rawReq.params?.[paramName];
}

/**
 * Extract a required path parameter from the request
 * @param req The request object
 * @param paramName The name of the parameter to extract
 * @returns The parameter value
 * @throws Error if the parameter is not found
 */
export function getRequiredPathParam(req: RequestWithCookies, paramName: string): string {
  const param = getPathParam(req, paramName);
  if (!param) {
    throw new Error(`Required path parameter '${paramName}' is missing`);
  }
  return param;
}

/**
 * Safely extract and validate a path parameter
 * @param req The request object
 * @param paramName The name of the parameter to extract
 * @param validator Optional validator function
 * @returns The validated parameter value or undefined if invalid
 */
export function getValidatedPathParam(
  req: RequestWithCookies,
  paramName: string,
  validator?: (value: string) => boolean
): string | undefined {
  const param = getPathParam(req, paramName);
  if (param && validator && !validator(param)) {
    return undefined;
  }
  return param;
}

/**
 * Extract query parameters from the request
 * @param req The request object
 * @returns The query parameters object
 */
export function getQueryParams(req: RequestWithCookies): Record<string, unknown> {
  const rawReq = req as RequestWithCookies & { query?: Record<string, unknown> };
  return rawReq.query || {};
}

/**
 * Extract a specific query parameter
 * @param req The request object
 * @param paramName The name of the query parameter to extract
 * @returns The parameter value or undefined
 */
export function getQueryParam(req: RequestWithCookies, paramName: string): unknown {
  const queryParams = getQueryParams(req);
  return queryParams[paramName];
}

/**
 * Extract a required query parameter
 * @param req The request object
 * @param paramName The name of the query parameter to extract
 * @returns The parameter value
 * @throws Error if the parameter is not found
 */
export function getRequiredQueryParam(req: RequestWithCookies, paramName: string): unknown {
  const param = getQueryParam(req, paramName);
  if (param === undefined) {
    throw new Error(`Required query parameter '${paramName}' is missing`);
  }
  return param;
}