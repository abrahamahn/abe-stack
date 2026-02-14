// main/server/core/src/auth/utils/user-agent.ts
/**
 * User Agent Parsing Utilities
 *
 * Lightweight parser for session labeling (browser + OS + device type).
 *
 * @module utils/user-agent
 */

export interface DeviceInfo {
  deviceName: string | null;
  deviceType: string | null;
}

const UNKNOWN_BROWSER = 'Unknown browser';
const UNKNOWN_DEVICE = 'Unknown device';

/**
 * Parse a user agent string into a human-readable device label and type.
 *
 * @param userAgent - Raw user agent string
 * @returns Device info with label and coarse device type
 */
export function parseUserAgentDeviceInfo(userAgent?: string | null): DeviceInfo {
  if (userAgent == null || userAgent === '') {
    return { deviceName: null, deviceType: null };
  }

  let browser = UNKNOWN_BROWSER;
  let os = UNKNOWN_DEVICE;

  // Browser detection (order matters)
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

  // OS detection
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS') || userAgent.includes('Macintosh')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  }

  const deviceName = `${browser} on ${os}`;

  let deviceType: string = 'unknown';
  if (userAgent.includes('iPad')) {
    deviceType = 'tablet';
  } else if (userAgent.includes('iPhone') || userAgent.includes('Android')) {
    deviceType = 'mobile';
  } else if (
    userAgent.includes('Windows') ||
    userAgent.includes('Mac OS') ||
    userAgent.includes('Macintosh') ||
    userAgent.includes('Linux')
  ) {
    deviceType = 'desktop';
  }

  return { deviceName, deviceType };
}
