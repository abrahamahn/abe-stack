/**
 * Verify email request data transfer object
 */
export interface VerifyEmailRequestDto {
  /**
   * Verification token
   */
  token: string;
}

/**
 * Verify email response data transfer object
 */
export interface VerifyEmailResponseDto {
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
 * Resend verification email request data transfer object
 */
export interface ResendVerificationRequestDto {
  /**
   * Email address to send verification to
   */
  email: string;
}

/**
 * Resend verification email response data transfer object
 */
export interface ResendVerificationResponseDto {
  /**
   * Whether the request was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;
}
