// src/engine/http/user.agent.ts
/**
 * @file User Agent Parsing
 * @description Utilities to extract browser and OS information from user agent strings.
 * @module Engine/HTTP/UserAgent
 */

export interface ParsedUserAgent {
  browser: string;
  os: string;
}

/**
 * Parse a user agent string to extract browser and OS information.
 */
export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  if (userAgent === null || userAgent === '') {
    return { browser: 'Unknown browser', os: 'Unknown device' };
  }

  let browser = 'Unknown browser';
  let os = 'Unknown device';

  // Browser detection (order matters — more specific first)
  if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
    browser = 'Opera';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  }

  // OS detection (order matters — more specific first)
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  }

  return { browser, os };
}
