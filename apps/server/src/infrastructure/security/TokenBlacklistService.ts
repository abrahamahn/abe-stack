/**
 * Metadata for blacklisted or whitelisted tokens
 */
export interface TokenMetadata {
  /** User ID associated with the token */
  userId?: string;
  /** Reason for blacklisting/whitelisting */
  reason?: string;
  /** When the token was added to the list */
  addedAt?: string;
  /** When the token should expire */
  expiresAt?: Date;
  /** Device information (useful for whitelist) */
  device?: string;
  /** IP address information */
  ipAddress?: string;
  /** Any additional custom data */
  [key: string]: any;
}

/**
 * Status of a token check
 */
export interface TokenStatus {
  /** Whether the token is blacklisted */
  isBlacklisted?: boolean;
  /** Whether the token is whitelisted */
  isWhitelisted?: boolean;
  /** Metadata associated with the token */
  metadata?: TokenMetadata;
}

/**
 * Result of a bulk operation
 */
export interface BulkOperationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** How many tokens were affected */
  count: number;
  /** Any errors that occurred */
  errors?: Error[];
}

/**
 * Interface for token blacklist operations
 */
export interface TokenBlacklist {
  /**
   * Add a token to the blacklist
   */
  add(tokenId: string, metadata?: TokenMetadata): Promise<boolean>;

  /**
   * Remove a token from the blacklist
   */
  remove(tokenId: string): Promise<boolean>;

  /**
   * Check if a token is blacklisted
   */
  check(tokenId: string): Promise<TokenStatus>;

  /**
   * Get metadata for a token
   */
  getMetadata(tokenId: string): Promise<TokenMetadata | null>;

  /**
   * List all blacklisted tokens
   */
  listAll(): Promise<string[]>;
}
