/**
 * Registration request data transfer object
 */
export interface RegisterRequestDto {
  /**
   * Username
   */
  username: string;

  /**
   * Email address
   */
  email: string;

  /**
   * Password
   */
  password: string;

  /**
   * First name (optional)
   */
  firstName?: string;

  /**
   * Last name (optional)
   */
  lastName?: string;
}

/**
 * Registration response data transfer object
 */
export interface RegisterResponseDto {
  /**
   * Whether the registration was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;

  /**
   * User ID (if registration was successful)
   */
  userId?: string;
}
