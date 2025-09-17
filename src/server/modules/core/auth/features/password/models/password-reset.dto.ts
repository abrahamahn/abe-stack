/**
 * Password reset request data transfer object
 */
export interface PasswordResetRequestDto {
  /**
   * Email of the account to reset password for
   */
  email: string;
}

/**
 * Password reset response data transfer object
 */
export interface PasswordResetResponseDto {
  /**
   * Whether the request was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;
}

/**
 * Complete password reset request data transfer object
 */
export interface CompleteResetRequestDto {
  /**
   * New password
   */
  newPassword: string;

  /**
   * Confirm new password
   */
  confirmPassword: string;
}

/**
 * Complete password reset response data transfer object
 */
export interface CompleteResetResponseDto {
  /**
   * Whether the reset was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;
}
