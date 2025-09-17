/**
 * MFA setup response data transfer object
 */
export interface MfaSetupResponseDto {
  /**
   * Whether the setup was successful
   */
  success: boolean;

  /**
   * TOTP secret key
   */
  secret: string;

  /**
   * QR code URL for TOTP setup
   */
  qrCodeUrl: string;

  /**
   * Error message if setup failed
   */
  error?: string;
}

/**
 * MFA verification request data transfer object
 */
export interface MfaVerifyRequestDto {
  /**
   * Verification code
   */
  code: string;
}

/**
 * MFA verification response data transfer object
 */
export interface MfaVerifyResponseDto {
  /**
   * Whether the verification was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;
}

/**
 * MFA disable request data transfer object
 */
export interface MfaDisableRequestDto {
  /**
   * Verification code to confirm disabling
   */
  code: string;
}

/**
 * MFA disable response data transfer object
 */
export interface MfaDisableResponseDto {
  /**
   * Whether MFA was successfully disabled
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;
}
