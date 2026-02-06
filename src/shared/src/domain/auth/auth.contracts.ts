// packages/shared/src/domain/auth/auth.contracts.ts

/**
 * @file Auth Contracts
 * @description API Contract definitions for the Authentication domain.
 * Maps endpoints to their request/response schemas.
 * @module Domain/Auth
 */

import { envelopeErrorResponseSchema, successResponseSchema } from '../../contracts/common';

import {
  authResponseSchema,
  changeEmailRequestSchema,
  changeEmailResponseSchema,
  confirmEmailChangeRequestSchema,
  confirmEmailChangeResponseSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  emptyBodySchema,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  loginRequestSchema,
  logoutResponseSchema,
  magicLinkRequestResponseSchema,
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  magicLinkVerifyResponseSchema,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  setPasswordRequestSchema,
  setPasswordResponseSchema,
  totpSetupResponseSchema,
  totpStatusResponseSchema,
  totpVerifyRequestSchema,
  totpVerifyResponseSchema,
} from './auth.schemas';

import type { Contract } from '../../contracts/types';

// ============================================================================
// Contract Definition
// ============================================================================

export const authContract = {
  // --------------------------------------------------------------------------
  // Registration & Login
  // --------------------------------------------------------------------------
  register: {
    method: 'POST' as const,
    path: '/api/auth/register',
    body: registerRequestSchema,
    responses: {
      201: successResponseSchema(registerResponseSchema),
      400: envelopeErrorResponseSchema,
      409: envelopeErrorResponseSchema,
    },
    summary: 'Register a new user - sends verification email',
  },

  login: {
    method: 'POST' as const,
    path: '/api/auth/login',
    body: loginRequestSchema,
    responses: {
      200: successResponseSchema(authResponseSchema),
      400: envelopeErrorResponseSchema,
      401: envelopeErrorResponseSchema,
    },
    summary: 'Login an existing user',
  },

  refresh: {
    method: 'POST' as const,
    path: '/api/auth/refresh',
    body: emptyBodySchema, // Note: Refresh token input is expected in HttpOnly cookie
    responses: {
      200: successResponseSchema(refreshResponseSchema),
      401: envelopeErrorResponseSchema,
    },
    summary: 'Refresh access token using refresh token cookie',
  },

  logout: {
    method: 'POST' as const,
    path: '/api/auth/logout',
    body: emptyBodySchema, // Note: Expects auth token/cookie to identify session
    responses: {
      200: successResponseSchema(logoutResponseSchema),
      401: envelopeErrorResponseSchema,
    },
    summary: 'Logout and invalidate refresh token',
  },

  // --------------------------------------------------------------------------
  // Email Verification & Password Management
  // --------------------------------------------------------------------------
  verifyEmail: {
    method: 'POST' as const,
    path: '/api/auth/verify-email',
    body: emailVerificationRequestSchema,
    responses: {
      200: successResponseSchema(emailVerificationResponseSchema),
      400: envelopeErrorResponseSchema,
      404: envelopeErrorResponseSchema,
    },
    summary: 'Verify email with a token - auto-logs in user',
  },

  resendVerification: {
    method: 'POST' as const,
    path: '/api/auth/resend-verification',
    body: resendVerificationRequestSchema,
    responses: {
      200: successResponseSchema(resendVerificationResponseSchema),
      400: envelopeErrorResponseSchema,
    },
    summary: 'Resend verification email to unverified user',
  },

  forgotPassword: {
    method: 'POST' as const,
    path: '/api/auth/forgot-password',
    body: forgotPasswordRequestSchema,
    responses: {
      200: successResponseSchema(forgotPasswordResponseSchema),
      400: envelopeErrorResponseSchema,
    },
    summary: 'Request password reset',
  },

  resetPassword: {
    method: 'POST' as const,
    path: '/api/auth/reset-password',
    body: resetPasswordRequestSchema,
    responses: {
      200: successResponseSchema(resetPasswordResponseSchema),
      400: envelopeErrorResponseSchema,
    },
    summary: 'Reset password with token',
  },

  setPassword: {
    method: 'POST' as const,
    path: '/api/auth/set-password',
    body: setPasswordRequestSchema,
    responses: {
      200: successResponseSchema(setPasswordResponseSchema),
      400: envelopeErrorResponseSchema,
      401: envelopeErrorResponseSchema,
      409: envelopeErrorResponseSchema,
    },
    summary: 'Set password for first time (magic-link only users)',
  },

  // --------------------------------------------------------------------------
  // Magic Link
  // --------------------------------------------------------------------------
  magicLinkRequest: {
    method: 'POST' as const,
    path: '/api/auth/magic-link/request',
    body: magicLinkRequestSchema,
    responses: {
      200: successResponseSchema(magicLinkRequestResponseSchema),
      400: envelopeErrorResponseSchema,
      429: envelopeErrorResponseSchema,
    },
    summary: 'Request a magic link for passwordless login',
  },

  magicLinkVerify: {
    method: 'POST' as const,
    path: '/api/auth/magic-link/verify',
    body: magicLinkVerifyRequestSchema,
    responses: {
      200: successResponseSchema(magicLinkVerifyResponseSchema),
      400: envelopeErrorResponseSchema,
      401: envelopeErrorResponseSchema,
    },
    summary: 'Verify magic link token and login',
  },

  // --------------------------------------------------------------------------
  // MFA / TOTP
  // --------------------------------------------------------------------------
  totpSetup: {
    method: 'POST' as const,
    path: '/api/auth/totp/setup',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(totpSetupResponseSchema),
      401: envelopeErrorResponseSchema,
      409: envelopeErrorResponseSchema,
    },
    summary: 'Generate TOTP secret and backup codes for 2FA setup',
  },

  totpEnable: {
    method: 'POST' as const,
    path: '/api/auth/totp/enable',
    body: totpVerifyRequestSchema,
    responses: {
      200: successResponseSchema(totpVerifyResponseSchema),
      400: envelopeErrorResponseSchema,
      401: envelopeErrorResponseSchema,
    },
    summary: 'Verify TOTP code and enable 2FA',
  },

  totpDisable: {
    method: 'POST' as const,
    path: '/api/auth/totp/disable',
    body: totpVerifyRequestSchema,
    responses: {
      200: successResponseSchema(totpVerifyResponseSchema),
      400: envelopeErrorResponseSchema,
      401: envelopeErrorResponseSchema,
    },
    summary: 'Disable 2FA by verifying current TOTP code',
  },

  totpStatus: {
    method: 'GET' as const,
    path: '/api/auth/totp/status',
    responses: {
      200: successResponseSchema(totpStatusResponseSchema),
      401: envelopeErrorResponseSchema,
    },
    summary: 'Check if 2FA is enabled for current user',
  },

  // --------------------------------------------------------------------------
  // Profile Updates
  // --------------------------------------------------------------------------
  changeEmail: {
    method: 'POST' as const,
    path: '/api/auth/change-email',
    body: changeEmailRequestSchema,
    responses: {
      200: successResponseSchema(changeEmailResponseSchema),
      400: envelopeErrorResponseSchema,
      401: envelopeErrorResponseSchema,
      409: envelopeErrorResponseSchema,
    },
    summary: 'Initiate email change - sends verification to new email',
  },

  confirmEmailChange: {
    method: 'POST' as const,
    path: '/api/auth/change-email/confirm',
    body: confirmEmailChangeRequestSchema,
    responses: {
      200: successResponseSchema(confirmEmailChangeResponseSchema),
      400: envelopeErrorResponseSchema,
      401: envelopeErrorResponseSchema,
    },
    summary: 'Confirm email change with verification token',
  },
} satisfies Contract;
