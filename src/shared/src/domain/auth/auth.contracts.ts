// src/shared/src/domain/auth/auth.contracts.ts
/**
 * Auth Contracts
 *
 * API Contract definitions for the Authentication domain.
 * Maps endpoints to their request/response schemas.
 * @module Domain/Auth
 */

import { errorResponseSchema, successResponseSchema } from '../../core/schemas';

import {
  oauthCallbackQuerySchema,
  oauthCallbackResponseSchema,
  oauthConnectionsResponseSchema,
  oauthEnabledProvidersResponseSchema,
  oauthInitiateResponseSchema,
  oauthLinkResponseSchema,
  oauthUnlinkResponseSchema,
} from './auth.oauth';
import {
  authResponseSchema,
  changeEmailRequestSchema,
  changeEmailResponseSchema,
  confirmEmailChangeRequestSchema,
  confirmEmailChangeResponseSchema,
  revertEmailChangeRequestSchema,
  revertEmailChangeResponseSchema,
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
  totpLoginChallengeResponseSchema,
  totpLoginVerifyRequestSchema,
  totpSetupResponseSchema,
  totpStatusResponseSchema,
  totpVerifyRequestSchema,
  totpVerifyResponseSchema,
} from './auth.schemas';

import type { Contract } from '../../core/api';

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
      400: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Register a new user - sends verification email',
  },

  login: {
    method: 'POST' as const,
    path: '/api/auth/login',
    body: loginRequestSchema,
    responses: {
      200: successResponseSchema(authResponseSchema),
      202: successResponseSchema(totpLoginChallengeResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Login an existing user (returns 202 if TOTP required)',
  },

  refresh: {
    method: 'POST' as const,
    path: '/api/auth/refresh',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(refreshResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Refresh access token using refresh token cookie',
  },

  logout: {
    method: 'POST' as const,
    path: '/api/auth/logout',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(logoutResponseSchema),
      401: errorResponseSchema,
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
      400: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Verify email with a token - auto-logs in user',
  },

  resendVerification: {
    method: 'POST' as const,
    path: '/api/auth/resend-verification',
    body: resendVerificationRequestSchema,
    responses: {
      200: successResponseSchema(resendVerificationResponseSchema),
      400: errorResponseSchema,
    },
    summary: 'Resend verification email to unverified user',
  },

  forgotPassword: {
    method: 'POST' as const,
    path: '/api/auth/forgot-password',
    body: forgotPasswordRequestSchema,
    responses: {
      200: successResponseSchema(forgotPasswordResponseSchema),
      400: errorResponseSchema,
    },
    summary: 'Request password reset',
  },

  resetPassword: {
    method: 'POST' as const,
    path: '/api/auth/reset-password',
    body: resetPasswordRequestSchema,
    responses: {
      200: successResponseSchema(resetPasswordResponseSchema),
      400: errorResponseSchema,
    },
    summary: 'Reset password with token',
  },

  setPassword: {
    method: 'POST' as const,
    path: '/api/auth/set-password',
    body: setPasswordRequestSchema,
    responses: {
      200: successResponseSchema(setPasswordResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      409: errorResponseSchema,
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
      400: errorResponseSchema,
      429: errorResponseSchema,
    },
    summary: 'Request a magic link for passwordless login',
  },

  magicLinkVerify: {
    method: 'POST' as const,
    path: '/api/auth/magic-link/verify',
    body: magicLinkVerifyRequestSchema,
    responses: {
      200: successResponseSchema(magicLinkVerifyResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
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
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Generate TOTP secret and backup codes for 2FA setup',
  },

  totpEnable: {
    method: 'POST' as const,
    path: '/api/auth/totp/enable',
    body: totpVerifyRequestSchema,
    responses: {
      200: successResponseSchema(totpVerifyResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Verify TOTP code and enable 2FA',
  },

  totpDisable: {
    method: 'POST' as const,
    path: '/api/auth/totp/disable',
    body: totpVerifyRequestSchema,
    responses: {
      200: successResponseSchema(totpVerifyResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Disable 2FA by verifying current TOTP code',
  },

  totpStatus: {
    method: 'GET' as const,
    path: '/api/auth/totp/status',
    responses: {
      200: successResponseSchema(totpStatusResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Check if 2FA is enabled for current user',
  },

  totpVerifyLogin: {
    method: 'POST' as const,
    path: '/api/auth/totp/verify-login',
    body: totpLoginVerifyRequestSchema,
    responses: {
      200: successResponseSchema(authResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Verify TOTP code during login challenge',
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
      400: errorResponseSchema,
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Initiate email change - sends verification to new email',
  },

  confirmEmailChange: {
    method: 'POST' as const,
    path: '/api/auth/change-email/confirm',
    body: confirmEmailChangeRequestSchema,
    responses: {
      200: successResponseSchema(confirmEmailChangeResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Confirm email change with verification token',
  },

  revertEmailChange: {
    method: 'POST' as const,
    path: '/api/auth/change-email/revert',
    body: revertEmailChangeRequestSchema,
    responses: {
      200: successResponseSchema(revertEmailChangeResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Revert email change with reversion token',
  },

  // --------------------------------------------------------------------------
  // OAuth
  // --------------------------------------------------------------------------
  initiateGoogle: {
    method: 'GET' as const,
    path: '/api/auth/oauth/google',
    responses: {
      302: successResponseSchema(oauthInitiateResponseSchema),
      400: errorResponseSchema,
    },
    summary: 'Initiate Google OAuth flow',
  },
  initiateGithub: {
    method: 'GET' as const,
    path: '/api/auth/oauth/github',
    responses: {
      302: successResponseSchema(oauthInitiateResponseSchema),
      400: errorResponseSchema,
    },
    summary: 'Initiate GitHub OAuth flow',
  },
  initiateApple: {
    method: 'GET' as const,
    path: '/api/auth/oauth/apple',
    responses: {
      302: successResponseSchema(oauthInitiateResponseSchema),
      400: errorResponseSchema,
    },
    summary: 'Initiate Apple OAuth flow',
  },
  callbackGoogle: {
    method: 'GET' as const,
    path: '/api/auth/oauth/google/callback',
    query: oauthCallbackQuerySchema,
    responses: {
      200: successResponseSchema(oauthCallbackResponseSchema),
      400: errorResponseSchema,
    },
    summary: 'Handle Google OAuth callback',
  },
  callbackGithub: {
    method: 'GET' as const,
    path: '/api/auth/oauth/github/callback',
    query: oauthCallbackQuerySchema,
    responses: {
      200: successResponseSchema(oauthCallbackResponseSchema),
      400: errorResponseSchema,
    },
    summary: 'Handle GitHub OAuth callback',
  },
  callbackApple: {
    method: 'GET' as const,
    path: '/api/auth/oauth/apple/callback',
    query: oauthCallbackQuerySchema,
    responses: {
      200: successResponseSchema(oauthCallbackResponseSchema),
      400: errorResponseSchema,
    },
    summary: 'Handle Apple OAuth callback',
  },
  linkGoogle: {
    method: 'POST' as const,
    path: '/api/auth/oauth/google/link',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(oauthLinkResponseSchema),
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Link Google account to authenticated user',
  },
  linkGithub: {
    method: 'POST' as const,
    path: '/api/auth/oauth/github/link',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(oauthLinkResponseSchema),
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Link GitHub account to authenticated user',
  },
  linkApple: {
    method: 'POST' as const,
    path: '/api/auth/oauth/apple/link',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(oauthLinkResponseSchema),
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Link Apple account to authenticated user',
  },
  unlinkGoogle: {
    method: 'DELETE' as const,
    path: '/api/auth/oauth/google/unlink',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(oauthUnlinkResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Unlink Google account from authenticated user',
  },
  unlinkGithub: {
    method: 'DELETE' as const,
    path: '/api/auth/oauth/github/unlink',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(oauthUnlinkResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Unlink GitHub account from authenticated user',
  },
  unlinkApple: {
    method: 'DELETE' as const,
    path: '/api/auth/oauth/apple/unlink',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(oauthUnlinkResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Unlink Apple account from authenticated user',
  },
  getConnections: {
    method: 'GET' as const,
    path: '/api/auth/oauth/connections',
    responses: {
      200: successResponseSchema(oauthConnectionsResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Get OAuth connections for authenticated user',
  },
  getEnabledProviders: {
    method: 'GET' as const,
    path: '/api/auth/oauth/providers',
    responses: {
      200: successResponseSchema(oauthEnabledProvidersResponseSchema),
    },
    summary: 'Get list of enabled OAuth providers',
  },
} satisfies Contract;
