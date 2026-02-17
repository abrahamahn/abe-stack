// main/shared/src/domain/auth/auth.contracts.ts
/**
 * Auth Contracts
 *
 * API Contract definitions for the Authentication domain.
 * Maps endpoints to their request/response schemas.
 * @module Domain/Auth
 */


import {
  acceptTosRequestSchema,
  acceptTosResponseSchema,
  authResponseSchema,
  changeEmailRequestSchema,
  changeEmailResponseSchema,
  confirmEmailChangeRequestSchema,
  confirmEmailChangeResponseSchema,
  deviceListResponseSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  invalidateSessionsResponseSchema,
  loginRequestSchema,
  loginSuccessResponseSchema,
  logoutResponseSchema,
  magicLinkRequestResponseSchema,
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  magicLinkVerifyResponseSchema,
  oauthCallbackQuerySchema,
  oauthCallbackResponseSchema,
  oauthConnectionsResponseSchema,
  oauthEnabledProvidersResponseSchema,
  oauthInitiateResponseSchema,
  oauthLinkResponseSchema,
  oauthUnlinkResponseSchema,
  passkeyListResponseSchema,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  removePhoneResponseSchema,
  renamePasskeyRequestSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  revertEmailChangeRequestSchema,
  revertEmailChangeResponseSchema,
  setPasswordRequestSchema,
  setPasswordResponseSchema,
  setPhoneRequestSchema,
  setPhoneResponseSchema,
  smsChallengeRequestSchema,
  smsVerifyRequestSchema,
  sudoRequestSchema,
  sudoResponseSchema,
  tosStatusResponseSchema,
  totpLoginChallengeResponseSchema,
  totpLoginVerifyRequestSchema,
  totpSetupResponseSchema,
  totpStatusResponseSchema,
  totpVerifyRequestSchema,
  totpVerifyResponseSchema,
  trustDeviceResponseSchema,
  verifyPhoneRequestSchema,
  verifyPhoneResponseSchema,
  webauthnLoginOptionsRequestSchema,
  webauthnLoginVerifyRequestSchema,
  webauthnOptionsResponseSchema,
  webauthnRegisterVerifyRequestSchema,
  webauthnRegisterVerifyResponseSchema,
} from '../core/auth';
import { errorResponseSchema, successResponseSchema } from '../engine/http';
import { emptyBodySchema } from '../engine/http/response';

import type { Contract } from '../primitives/api';

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
      200: loginSuccessResponseSchema,
      202: totpLoginChallengeResponseSchema,
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
      200: refreshResponseSchema,
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

  logoutAll: {
    method: 'POST' as const,
    path: '/api/auth/logout-all',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(logoutResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Logout from all sessions',
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

  acceptTos: {
    method: 'POST' as const,
    path: '/api/auth/tos/accept',
    body: acceptTosRequestSchema,
    responses: {
      200: successResponseSchema(acceptTosResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Accept terms of service document',
  },

  tosStatus: {
    method: 'GET' as const,
    path: '/api/auth/tos/status',
    responses: {
      200: successResponseSchema(tosStatusResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Get terms of service acceptance status',
  },

  sudo: {
    method: 'POST' as const,
    path: '/api/auth/sudo',
    body: sudoRequestSchema,
    responses: {
      200: successResponseSchema(sudoResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Enter sudo mode for privileged operations',
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

  // --------------------------------------------------------------------------
  // Devices, Phone, SMS Challenge, Sessions
  // --------------------------------------------------------------------------
  listDevices: {
    method: 'GET' as const,
    path: '/api/users/me/devices',
    responses: {
      200: successResponseSchema(deviceListResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'List trusted devices',
  },
  trustDevice: {
    method: 'POST' as const,
    path: '/api/users/me/devices/:id/trust',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(trustDeviceResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Trust a device',
  },
  revokeDevice: {
    method: 'DELETE' as const,
    path: '/api/users/me/devices/:id',
    responses: {
      200: successResponseSchema(totpVerifyResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Revoke a trusted device',
  },
  setPhone: {
    method: 'POST' as const,
    path: '/api/users/me/phone',
    body: setPhoneRequestSchema,
    responses: {
      200: successResponseSchema(setPhoneResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      429: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Set phone number and send verification code',
  },
  verifyPhone: {
    method: 'POST' as const,
    path: '/api/users/me/phone/verify',
    body: verifyPhoneRequestSchema,
    responses: {
      200: successResponseSchema(verifyPhoneResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Verify phone number',
  },
  removePhone: {
    method: 'DELETE' as const,
    path: '/api/users/me/phone/delete',
    responses: {
      200: successResponseSchema(removePhoneResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Remove phone number',
  },
  invalidateSessions: {
    method: 'POST' as const,
    path: '/api/auth/invalidate-sessions',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(invalidateSessionsResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Invalidate all sessions',
  },
  smsSendCode: {
    method: 'POST' as const,
    path: '/api/auth/sms/send',
    body: smsChallengeRequestSchema,
    responses: {
      200: successResponseSchema(totpVerifyResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      429: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Send SMS verification code for login challenge',
  },
  smsVerifyCode: {
    method: 'POST' as const,
    path: '/api/auth/sms/verify',
    body: smsVerifyRequestSchema,
    responses: {
      200: successResponseSchema(authResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Verify SMS code for login challenge',
  },

  // --------------------------------------------------------------------------
  // WebAuthn / Passkeys
  // --------------------------------------------------------------------------
  webauthnRegisterOptions: {
    method: 'POST' as const,
    path: '/api/auth/webauthn/register/options',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(webauthnOptionsResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Generate WebAuthn registration options',
  },
  webauthnRegisterVerify: {
    method: 'POST' as const,
    path: '/api/auth/webauthn/register/verify',
    body: webauthnRegisterVerifyRequestSchema,
    responses: {
      200: successResponseSchema(webauthnRegisterVerifyResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Verify WebAuthn registration',
  },
  webauthnLoginOptions: {
    method: 'POST' as const,
    path: '/api/auth/webauthn/login/options',
    body: webauthnLoginOptionsRequestSchema,
    responses: {
      200: successResponseSchema(webauthnOptionsResponseSchema),
      400: errorResponseSchema,
    },
    summary: 'Generate WebAuthn login options',
  },
  webauthnLoginVerify: {
    method: 'POST' as const,
    path: '/api/auth/webauthn/login/verify',
    body: webauthnLoginVerifyRequestSchema,
    responses: {
      200: successResponseSchema(authResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Verify WebAuthn login',
  },
  listPasskeys: {
    method: 'GET' as const,
    path: '/api/users/me/passkeys',
    responses: {
      200: successResponseSchema(passkeyListResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'List passkeys',
  },
  renamePasskey: {
    method: 'PATCH' as const,
    path: '/api/users/me/passkeys/:id',
    body: renamePasskeyRequestSchema,
    responses: {
      200: successResponseSchema(totpVerifyResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Rename passkey',
  },
  deletePasskey: {
    method: 'DELETE' as const,
    path: '/api/users/me/passkeys/:id/delete',
    responses: {
      200: successResponseSchema(totpVerifyResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Delete passkey',
  },
} satisfies Contract;
