// backend/server/src/infra/config/validator.ts
/**
 * Environment validation at startup
 * Ensures all required environment variables are present and valid
 */

import { MIN_JWT_SECRET_LENGTH } from '../../common/constants';

/**
 * Validate required environment variables at startup
 * Throws an error if any required variables are missing or invalid
 */
export function validateEnvironment(): void {
  const errors: string[] = [];

  // JWT Secret validation
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required');
  } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(
      `JWT_SECRET must be at least ${String(MIN_JWT_SECRET_LENGTH)} characters (current: ${String(jwtSecret.length)})`,
    );
  }

  // Database URL validation
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  // Validate numeric environment variables
  const numericVars = [
    'LOCKOUT_MAX_ATTEMPTS',
    'LOCKOUT_DURATION_MS',
    'REFRESH_TOKEN_EXPIRY_DAYS',
    'REFRESH_TOKEN_GRACE_PERIOD',
    'PASSWORD_MIN_LENGTH',
    'PASSWORD_MAX_LENGTH',
    'PASSWORD_MIN_SCORE',
  ];

  for (const varName of numericVars) {
    const value = process.env[varName];
    if (value && isNaN(parseInt(value, 10))) {
      errors.push(`${varName} must be a valid number (current: ${value})`);
    }
  }

  // Validate PASSWORD_MIN_SCORE is between 0-4
  const minScore = parseInt(process.env.PASSWORD_MIN_SCORE || '3', 10);
  if (minScore < 0 || minScore > 4) {
    errors.push(`PASSWORD_MIN_SCORE must be between 0 and 4 (current: ${String(minScore)})`);
  }

  // NODE_ENV validation (warn if not set)
  if (!process.env.NODE_ENV) {
    // eslint-disable-next-line no-console
    console.warn('⚠️  NODE_ENV is not set, defaulting to development mode');
  }

  // If there are errors, throw with all of them
  if (errors.length > 0) {
    const errorMessage = [
      '❌ Environment validation failed:',
      ...errors.map((err) => `  - ${err}`),
      '',
      'Please check your .env file and ensure all required variables are set.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // eslint-disable-next-line no-console
  console.log('✅ Environment variables validated successfully');
}
