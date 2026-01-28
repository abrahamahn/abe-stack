// apps/server/src/shared/constants.test.ts
import {
  DAYS_PER_WEEK,
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from '@abe-stack/core';
import { describe, expect, it } from 'vitest';

import {
  CSRF_COOKIE_NAME,
  ERROR_MESSAGES,
  FAILURE_REASONS,
  HTTP_STATUS,
  MAX_PROGRESSIVE_DELAY_MS,
  MIN_JWT_SECRET_LENGTH,
  PROGRESSIVE_DELAY_WINDOW_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_BYTES,
  SUCCESS_MESSAGES,
} from './constants';

describe('Time Constants', () => {
  describe('Re-exported from @abe-stack/core', () => {
    it('should export MS_PER_SECOND with correct value', () => {
      expect(MS_PER_SECOND).toBe(1000);
    });

    it('should export SECONDS_PER_MINUTE with correct value', () => {
      expect(SECONDS_PER_MINUTE).toBe(60);
    });

    it('should export MINUTES_PER_HOUR with correct value', () => {
      expect(MINUTES_PER_HOUR).toBe(60);
    });

    it('should export HOURS_PER_DAY with correct value', () => {
      expect(HOURS_PER_DAY).toBe(24);
    });

    it('should export DAYS_PER_WEEK with correct value', () => {
      expect(DAYS_PER_WEEK).toBe(7);
    });
  });

  describe('Derived time constants', () => {
    it('should export MS_PER_MINUTE with correct calculated value', () => {
      expect(MS_PER_MINUTE).toBe(60000);
      expect(MS_PER_MINUTE).toBe(MS_PER_SECOND * SECONDS_PER_MINUTE);
    });

    it('should export MS_PER_HOUR with correct calculated value', () => {
      expect(MS_PER_HOUR).toBe(3600000);
      expect(MS_PER_HOUR).toBe(MS_PER_MINUTE * MINUTES_PER_HOUR);
    });

    it('should export MS_PER_DAY with correct calculated value', () => {
      expect(MS_PER_DAY).toBe(86400000);
      expect(MS_PER_DAY).toBe(MS_PER_HOUR * HOURS_PER_DAY);
    });

    it('should export SECONDS_PER_HOUR with correct calculated value', () => {
      expect(SECONDS_PER_HOUR).toBe(3600);
      expect(SECONDS_PER_HOUR).toBe(SECONDS_PER_MINUTE * MINUTES_PER_HOUR);
    });

    it('should export SECONDS_PER_DAY with correct calculated value', () => {
      expect(SECONDS_PER_DAY).toBe(86400);
      expect(SECONDS_PER_DAY).toBe(SECONDS_PER_HOUR * HOURS_PER_DAY);
    });
  });
});

describe('Security Constants', () => {
  it('should export MIN_JWT_SECRET_LENGTH as 32 bytes (256 bits)', () => {
    expect(MIN_JWT_SECRET_LENGTH).toBe(32);
  });

  it('should export REFRESH_TOKEN_BYTES as 64 bytes (512 bits)', () => {
    expect(REFRESH_TOKEN_BYTES).toBe(64);
  });

  describe('Progressive delay constants', () => {
    it('should export PROGRESSIVE_DELAY_WINDOW_MS as 5 minutes in milliseconds', () => {
      expect(PROGRESSIVE_DELAY_WINDOW_MS).toBe(5 * MS_PER_MINUTE);
      expect(PROGRESSIVE_DELAY_WINDOW_MS).toBe(300000);
    });

    it('should export MAX_PROGRESSIVE_DELAY_MS as 30 seconds in milliseconds', () => {
      expect(MAX_PROGRESSIVE_DELAY_MS).toBe(30 * MS_PER_SECOND);
      expect(MAX_PROGRESSIVE_DELAY_MS).toBe(30000);
    });

    it('should ensure max delay is less than delay window', () => {
      expect(MAX_PROGRESSIVE_DELAY_MS).toBeLessThan(PROGRESSIVE_DELAY_WINDOW_MS);
    });
  });
});

describe('Cookie Names', () => {
  it('should export REFRESH_COOKIE_NAME', () => {
    expect(REFRESH_COOKIE_NAME).toBe('refreshToken');
  });

  it('should export CSRF_COOKIE_NAME', () => {
    expect(CSRF_COOKIE_NAME).toBe('_csrf');
  });

  it('should ensure cookie names are non-empty strings', () => {
    expect(REFRESH_COOKIE_NAME).toBeTruthy();
    expect(REFRESH_COOKIE_NAME.length).toBeGreaterThan(0);
    expect(CSRF_COOKIE_NAME).toBeTruthy();
    expect(CSRF_COOKIE_NAME.length).toBeGreaterThan(0);
  });

  it('should ensure cookie names do not contain spaces', () => {
    expect(REFRESH_COOKIE_NAME).not.toMatch(/\s/);
    expect(CSRF_COOKIE_NAME).not.toMatch(/\s/);
  });
});

describe('HTTP Status Codes', () => {
  describe('Success status codes', () => {
    it('should export OK as 200', () => {
      expect(HTTP_STATUS.OK).toBe(200);
    });

    it('should export CREATED as 201', () => {
      expect(HTTP_STATUS.CREATED).toBe(201);
    });

    it('should export NO_CONTENT as 204', () => {
      expect(HTTP_STATUS.NO_CONTENT).toBe(204);
    });
  });

  describe('Client error status codes', () => {
    it('should export BAD_REQUEST as 400', () => {
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
    });

    it('should export UNAUTHORIZED as 401', () => {
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    });

    it('should export FORBIDDEN as 403', () => {
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    });

    it('should export NOT_FOUND as 404', () => {
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    });

    it('should export CONFLICT as 409', () => {
      expect(HTTP_STATUS.CONFLICT).toBe(409);
    });

    it('should export UNPROCESSABLE_ENTITY as 422', () => {
      expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422);
    });

    it('should export TOO_MANY_REQUESTS as 429', () => {
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
    });
  });

  describe('Server error status codes', () => {
    it('should export INTERNAL_SERVER_ERROR as 500', () => {
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });

    it('should export SERVICE_UNAVAILABLE as 503', () => {
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
    });
  });

  describe('HTTP_STATUS object properties', () => {
    it('should contain only valid HTTP status codes', () => {
      const statusCodes = Object.values(HTTP_STATUS);
      statusCodes.forEach((code) => {
        expect(code).toBeGreaterThanOrEqual(200);
        expect(code).toBeLessThanOrEqual(599);
      });
    });

    it('should have all status codes as numbers', () => {
      const statusCodes = Object.values(HTTP_STATUS);
      statusCodes.forEach((code) => {
        expect(typeof code).toBe('number');
      });
    });
  });
});

describe('Error Messages', () => {
  describe('General error messages', () => {
    it('should export INTERNAL_ERROR message', () => {
      expect(ERROR_MESSAGES.INTERNAL_ERROR).toBe('Internal server error');
    });

    it('should export NOT_FOUND message', () => {
      expect(ERROR_MESSAGES.NOT_FOUND).toBe('Resource not found');
    });

    it('should export BAD_REQUEST message', () => {
      expect(ERROR_MESSAGES.BAD_REQUEST).toBe('Bad request');
    });
  });

  describe('Authentication error messages', () => {
    it('should export INVALID_CREDENTIALS message', () => {
      expect(ERROR_MESSAGES.INVALID_CREDENTIALS).toBe('Invalid email or password');
    });

    it('should export EMAIL_ALREADY_REGISTERED message', () => {
      expect(ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED).toBe('Email already registered');
    });

    it('should export USER_NOT_FOUND message', () => {
      expect(ERROR_MESSAGES.USER_NOT_FOUND).toBe('User not found');
    });

    it('should export ACCOUNT_LOCKED message', () => {
      expect(ERROR_MESSAGES.ACCOUNT_LOCKED).toBe(
        'Account temporarily locked due to too many failed attempts. Please try again later.',
      );
    });

    it('should export WEAK_PASSWORD message', () => {
      expect(ERROR_MESSAGES.WEAK_PASSWORD).toBe('Password is too weak');
    });

    it('should export INVALID_TOKEN message', () => {
      expect(ERROR_MESSAGES.INVALID_TOKEN).toBe('Invalid or expired token');
    });

    it('should export NO_REFRESH_TOKEN message', () => {
      expect(ERROR_MESSAGES.NO_REFRESH_TOKEN).toBe('No refresh token provided');
    });

    it('should export UNAUTHORIZED message', () => {
      expect(ERROR_MESSAGES.UNAUTHORIZED).toBe('Unauthorized');
    });

    it('should export FORBIDDEN message', () => {
      expect(ERROR_MESSAGES.FORBIDDEN).toBe('Forbidden - insufficient permissions');
    });

    it('should export MISSING_AUTH_HEADER message', () => {
      expect(ERROR_MESSAGES.MISSING_AUTH_HEADER).toBe('Missing or invalid authorization header');
    });

    it('should export INVALID_OR_EXPIRED_TOKEN message', () => {
      expect(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN).toBe('Invalid or expired token');
    });
  });

  describe('User operation error messages', () => {
    it('should export FAILED_USER_CREATION message', () => {
      expect(ERROR_MESSAGES.FAILED_USER_CREATION).toBe('Failed to create user');
    });

    it('should export FAILED_TOKEN_FAMILY message', () => {
      expect(ERROR_MESSAGES.FAILED_TOKEN_FAMILY).toBe('Failed to create refresh token family');
    });
  });

  describe('OAuth error messages', () => {
    it('should export OAUTH_STATE_MISMATCH message', () => {
      expect(ERROR_MESSAGES.OAUTH_STATE_MISMATCH).toBe(
        'OAuth state mismatch - possible CSRF attack',
      );
    });

    it('should export OAUTH_CODE_MISSING message', () => {
      expect(ERROR_MESSAGES.OAUTH_CODE_MISSING).toBe('OAuth authorization code missing');
    });

    it('should export OAUTH_PROVIDER_ERROR message', () => {
      expect(ERROR_MESSAGES.OAUTH_PROVIDER_ERROR).toBe('OAuth provider returned an error');
    });
  });

  describe('Magic Link error messages', () => {
    it('should export MAGIC_LINK_EXPIRED message', () => {
      expect(ERROR_MESSAGES.MAGIC_LINK_EXPIRED).toBe('Magic link has expired');
    });

    it('should export MAGIC_LINK_INVALID message', () => {
      expect(ERROR_MESSAGES.MAGIC_LINK_INVALID).toBe('Invalid magic link');
    });

    it('should export MAGIC_LINK_ALREADY_USED message', () => {
      expect(ERROR_MESSAGES.MAGIC_LINK_ALREADY_USED).toBe('Magic link has already been used');
    });
  });

  describe('Email error messages', () => {
    it('should export EMAIL_VERIFICATION_NOT_IMPLEMENTED message', () => {
      expect(ERROR_MESSAGES.EMAIL_VERIFICATION_NOT_IMPLEMENTED).toBe(
        'Email verification not implemented',
      );
    });

    it('should export EMAIL_SEND_FAILED message', () => {
      expect(ERROR_MESSAGES.EMAIL_SEND_FAILED).toBe(
        'Failed to send email. Please try again or use the resend option.',
      );
    });
  });

  describe('TOTP error messages', () => {
    it('should export TOTP_INVALID_CODE message', () => {
      expect(ERROR_MESSAGES.TOTP_INVALID_CODE).toBe('Invalid verification code');
    });

    it('should export TOTP_ALREADY_ENABLED message', () => {
      expect(ERROR_MESSAGES.TOTP_ALREADY_ENABLED).toBe('2FA is already enabled');
    });

    it('should export TOTP_NOT_ENABLED message', () => {
      expect(ERROR_MESSAGES.TOTP_NOT_ENABLED).toBe('2FA is not enabled for this account');
    });

    it('should export TOTP_REQUIRED message', () => {
      expect(ERROR_MESSAGES.TOTP_REQUIRED).toBe('2FA verification required');
    });
  });

  describe('Error message object properties', () => {
    it('should have all messages as non-empty strings', () => {
      const messages = Object.values(ERROR_MESSAGES);
      messages.forEach((message) => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should have all messages start with capital letter or number', () => {
      const messages = Object.values(ERROR_MESSAGES);
      messages.forEach((message) => {
        expect(message[0]).toMatch(/[A-Z0-9]/);
      });
    });
  });
});

describe('Success Messages', () => {
  it('should export LOGGED_OUT message', () => {
    expect(SUCCESS_MESSAGES.LOGGED_OUT).toBe('Logged out successfully');
  });

  it('should export ACCOUNT_UNLOCKED message', () => {
    expect(SUCCESS_MESSAGES.ACCOUNT_UNLOCKED).toBe('Account unlocked successfully');
  });

  it('should export PASSWORD_RESET_SENT message', () => {
    expect(SUCCESS_MESSAGES.PASSWORD_RESET_SENT).toBe('Password reset email sent');
  });

  it('should export VERIFICATION_EMAIL_SENT message', () => {
    expect(SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT).toBe(
      'Verification email sent. Please check your inbox and click the confirmation link.',
    );
  });

  it('should export MAGIC_LINK_SENT message', () => {
    expect(SUCCESS_MESSAGES.MAGIC_LINK_SENT).toBe('Magic link sent to your email');
  });

  it('should export TOTP_ENABLED message', () => {
    expect(SUCCESS_MESSAGES.TOTP_ENABLED).toBe('Two-factor authentication enabled');
  });

  it('should export TOTP_DISABLED message', () => {
    expect(SUCCESS_MESSAGES.TOTP_DISABLED).toBe('Two-factor authentication disabled');
  });

  describe('Success message object properties', () => {
    it('should have all messages as non-empty strings', () => {
      const messages = Object.values(SUCCESS_MESSAGES);
      messages.forEach((message) => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should have all messages start with capital letter or number', () => {
      const messages = Object.values(SUCCESS_MESSAGES);
      messages.forEach((message) => {
        expect(message[0]).toMatch(/[A-Z0-9]/);
      });
    });

    it('should not have duplicate messages', () => {
      const messages = Object.values(SUCCESS_MESSAGES);
      const uniqueMessages = new Set(messages);
      expect(uniqueMessages.size).toBe(messages.length);
    });
  });
});

describe('Failure Reasons', () => {
  it('should export ACCOUNT_LOCKED reason', () => {
    expect(FAILURE_REASONS.ACCOUNT_LOCKED).toBe('Account locked');
  });

  it('should export USER_NOT_FOUND reason', () => {
    expect(FAILURE_REASONS.USER_NOT_FOUND).toBe('User not found');
  });

  it('should export INVALID_PASSWORD reason', () => {
    expect(FAILURE_REASONS.INVALID_PASSWORD).toBe('Invalid password');
  });

  it('should export TOKEN_EXPIRED reason', () => {
    expect(FAILURE_REASONS.TOKEN_EXPIRED).toBe('Token expired');
  });

  it('should export TOKEN_REUSED reason', () => {
    expect(FAILURE_REASONS.TOKEN_REUSED).toBe('Token reuse detected');
  });

  it('should export TOKEN_REVOKED reason', () => {
    expect(FAILURE_REASONS.TOKEN_REVOKED).toBe('Token family revoked');
  });

  it('should export OAUTH_FAILED reason', () => {
    expect(FAILURE_REASONS.OAUTH_FAILED).toBe('OAuth authentication failed');
  });

  it('should export MAGIC_LINK_FAILED reason', () => {
    expect(FAILURE_REASONS.MAGIC_LINK_FAILED).toBe('Magic link authentication failed');
  });

  it('should export TOTP_FAILED reason', () => {
    expect(FAILURE_REASONS.TOTP_FAILED).toBe('TOTP verification failed');
  });

  describe('Failure reason object properties', () => {
    it('should have all reasons as non-empty strings', () => {
      const reasons = Object.values(FAILURE_REASONS);
      reasons.forEach((reason) => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      });
    });

    it('should have all reasons start with capital letter or number', () => {
      const reasons = Object.values(FAILURE_REASONS);
      reasons.forEach((reason) => {
        expect(reason[0]).toMatch(/[A-Z0-9]/);
      });
    });

    it('should not have duplicate reasons', () => {
      const reasons = Object.values(FAILURE_REASONS);
      const uniqueReasons = new Set(reasons);
      expect(uniqueReasons.size).toBe(reasons.length);
    });

    it('should be suitable for audit logging (concise and descriptive)', () => {
      const reasons = Object.values(FAILURE_REASONS);
      reasons.forEach((reason) => {
        expect(reason.length).toBeLessThanOrEqual(50);
        expect(reason).not.toMatch(/\n/);
      });
    });
  });
});

describe('Cross-category validation', () => {
  describe('Security constants relationships', () => {
    it('should ensure JWT secret length is sufficient for cryptographic strength', () => {
      expect(MIN_JWT_SECRET_LENGTH).toBeGreaterThanOrEqual(32);
    });

    it('should ensure refresh token bytes is greater than JWT secret length', () => {
      expect(REFRESH_TOKEN_BYTES).toBeGreaterThan(MIN_JWT_SECRET_LENGTH);
    });
  });

  describe('Message and status code alignment', () => {
    it('should have error messages that align with HTTP status codes', () => {
      expect(ERROR_MESSAGES.UNAUTHORIZED).toBeTruthy();
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);

      expect(ERROR_MESSAGES.FORBIDDEN).toBeTruthy();
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);

      expect(ERROR_MESSAGES.NOT_FOUND).toBeTruthy();
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    });
  });

  describe('Failure reasons and error messages correlation', () => {
    it('should have corresponding entries for common auth failures', () => {
      expect(FAILURE_REASONS.USER_NOT_FOUND).toBe('User not found');
      expect(ERROR_MESSAGES.USER_NOT_FOUND).toBe('User not found');

      expect(FAILURE_REASONS.ACCOUNT_LOCKED).toBe('Account locked');
      expect(ERROR_MESSAGES.ACCOUNT_LOCKED).toContain('Account temporarily locked');
    });

    it('should have failure reasons for all auth mechanisms', () => {
      expect(FAILURE_REASONS.OAUTH_FAILED).toBeTruthy();
      expect(FAILURE_REASONS.MAGIC_LINK_FAILED).toBeTruthy();
      expect(FAILURE_REASONS.TOTP_FAILED).toBeTruthy();
    });
  });
});
