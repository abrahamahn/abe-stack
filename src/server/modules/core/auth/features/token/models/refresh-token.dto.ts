/**
 * Refresh token request data transfer object
 */
export interface RefreshTokenRequestDto {
  /**
   * Refresh token
   */
  refreshToken: string;
}

/**
 * Refresh token response data transfer object
 */
export interface RefreshTokenResponseDto {
  /**
   * New JWT access token
   */
  token: string;

  /**
   * New JWT refresh token
   */
  refreshToken: string;

  /**
   * Error message if refresh failed
   */
  error?: string;
}
