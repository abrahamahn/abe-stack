/**
 * Verification token model
 */
export interface VerificationToken {
  /**
   * Unique ID
   */
  id: string;

  /**
   * Associated user ID
   */
  userId: string;

  /**
   * Verification token string
   */
  token: string;

  /**
   * Expiry timestamp
   */
  expiresAt: Date;

  /**
   * Whether the token has been used
   */
  used: boolean;

  /**
   * When the token was used
   */
  usedAt?: Date;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt: Date;
}

/**
 * Verification result interface
 */
export interface VerificationResult {
  /**
   * Whether the verification was successful
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;

  /**
   * User ID (if successful)
   */
  userId?: string;
}
