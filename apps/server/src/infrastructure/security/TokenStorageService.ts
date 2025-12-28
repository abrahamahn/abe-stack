/**
 * Token metadata interface
 */
export interface TokenData {
  userId: string;
  createdAt: Date;
  expiresIn: number; // Expiration time in seconds
  metadata?: Record<string, any>; // Optional additional metadata
}

/**
 * Token info with ID
 */
export interface TokenInfo {
  tokenId: string;
  userId: string;
  createdAt: Date;
  expiresIn: number;
  metadata?: Record<string, any>;
}

/**
 * Options for token storage
 */
export interface TokenStorageOptions {
  prefix?: string;
  redisUrl?: string;
  redisOptions?: Record<string, any>; // Generic type instead of Redis.RedisOptions
}

/**
 * Abstract interface for token storage
 */
export interface TokenStorage {
  /**
   * Store a token with associated data
   */
  storeToken(tokenId: string, data: TokenData): Promise<void>;

  /**
   * Retrieve data for a token
   */
  getTokenData(tokenId: string): Promise<TokenData | null>;

  /**
   * Remove a token from storage
   */
  removeToken(tokenId: string): Promise<void>;

  /**
   * Check if a token exists
   */
  hasToken(tokenId: string): Promise<boolean>;

  /**
   * Get all tokens for a user
   */
  getAllUserTokens(userId: string): Promise<TokenInfo[]>;

  /**
   * Remove all tokens for a user
   */
  removeAllUserTokens(userId: string): Promise<void>;

  /**
   * Clean up expired tokens
   */
  clearExpiredTokens(): Promise<void>;

  /**
   * Close any connections (if applicable)
   */
  close?(): Promise<void>;
}
