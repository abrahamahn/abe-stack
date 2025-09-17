/**
 * Encryption Utilities
 *
 * Core functionality for encrypting and decrypting data securely.
 */

import {
  createHmac,
  timingSafeEqual,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scrypt,
  CipherGCM,
  DecipherGCM,
} from "crypto";
import { promisify } from "util";

// Promisify scrypt for async usage
const scryptAsync = promisify(scrypt);

/**
 * Encryption options
 */
export interface EncryptionOptions {
  /** Encryption algorithm to use */
  algorithm?: string;
  /** Initialization vector length in bytes */
  ivLength?: number;
  /** Key length in bytes */
  keyLength?: number;
  /** Salt for key derivation */
  salt?: string;
}

/**
 * Default encryption options
 */
export const DEFAULT_ENCRYPTION_OPTIONS: EncryptionOptions = {
  algorithm: "aes-256-gcm",
  ivLength: 16,
  keyLength: 32,
  salt: "default-encryption-salt", // In production, use a secure environment variable
};

/**
 * Type for data that can be signed or encrypted
 */
export type Data = {
  [key: string]: string | number | boolean | object | null | undefined;
};

/**
 * Options for creating and verifying signatures
 */
export interface SignatureOptions {
  /**
   * HMAC algorithm to use (default: sha512)
   * See Node.js crypto.createHmac() for supported algorithms
   */
  algorithm?: "sha256" | "sha384" | "sha512";

  /** Output format for the signature (default: base64) */
  format?: "base64" | "hex";

  /**
   * Include a timestamp to prevent replay attacks
   * Use with verifyMaxAge
   */
  addTimestamp?: boolean;

  /** Maximum age (in ms) for signature to be valid */
  verifyMaxAge?: number;
}

/**
 * Default signature options
 */
export const DEFAULT_SIGNATURE_OPTIONS: SignatureOptions = {
  algorithm: "sha512",
  format: "base64",
  addTimestamp: false,
  verifyMaxAge: 3600000, // 1 hour
};

/**
 * Result of encryption operation
 */
export interface EncryptionResult {
  /** Encrypted data as a base64 string */
  content: string;
  /** Initialization vector as a base64 string */
  iv: string;
  /** Authentication tag (for GCM mode) as a base64 string */
  tag?: string;
}

/**
 * Encrypt data with a secure algorithm
 *
 * @param data - String data to encrypt
 * @param key - Encryption key (optional, will be derived from options.salt if not provided)
 * @param options - Encryption options
 * @returns Promise resolving to encrypted data string
 */
export async function encrypt(
  data: string,
  key?: Buffer,
  options?: EncryptionOptions
): Promise<string> {
  try {
    const mergedOptions = { ...DEFAULT_ENCRYPTION_OPTIONS, ...options };
    const { algorithm, ivLength, keyLength, salt } = mergedOptions;

    // Generate random IV to ensure different outputs for the same input
    const iv = randomBytes(ivLength!);

    // Derive key if not provided
    const derivedKey =
      key || ((await scryptAsync(salt!, "salt", keyLength!)) as Buffer);

    // Create cipher
    const cipher = createCipheriv(algorithm!, derivedKey, iv);

    // Encrypt data
    let encrypted = cipher.update(data, "utf8", "base64");
    encrypted += cipher.final("base64");

    // Get authentication tag if using GCM mode
    let authTag: string | undefined;
    if (algorithm!.includes("gcm")) {
      // Type assertion to CipherGCM for GCM mode
      authTag = (cipher as CipherGCM).getAuthTag().toString("base64");
    }

    // Create result object
    const result: EncryptionResult = {
      content: encrypted,
      iv: iv.toString("base64"),
    };

    if (authTag) {
      result.tag = authTag;
    }

    // Return serialized result
    return Buffer.from(JSON.stringify(result)).toString("base64");
  } catch (error) {
    throw new Error(`Encryption failed: ${(error as Error).message}`);
  }
}

/**
 * Decrypt encrypted data
 *
 * @param encryptedData - Encrypted data string to decrypt
 * @param key - Decryption key (optional, will be derived from options.salt if not provided)
 * @param options - Decryption options
 * @returns Promise resolving to decrypted data string
 */
export async function decrypt(
  encryptedData: string,
  key?: Buffer,
  options?: EncryptionOptions
): Promise<string> {
  try {
    const mergedOptions = { ...DEFAULT_ENCRYPTION_OPTIONS, ...options };
    const { algorithm, keyLength, salt } = mergedOptions;

    // Parse the encrypted data
    const encryptedObj: EncryptionResult = JSON.parse(
      Buffer.from(encryptedData, "base64").toString("utf8")
    );

    // Get encrypted content, IV, and auth tag
    const { content, iv, tag } = encryptedObj;

    // Derive key if not provided
    const derivedKey =
      key || ((await scryptAsync(salt!, "salt", keyLength!)) as Buffer);

    // Create decipher
    const decipher = createDecipheriv(
      algorithm!,
      derivedKey,
      Buffer.from(iv, "base64")
    );

    // Set auth tag if using GCM mode
    if (algorithm!.includes("gcm") && tag) {
      // Type assertion to DecipherGCM for GCM mode
      (decipher as DecipherGCM).setAuthTag(Buffer.from(tag, "base64"));
    }

    // Decrypt data
    let decrypted = decipher.update(content, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${(error as Error).message}`);
  }
}

/**
 * Generate a secure encryption key
 *
 * @param length - Length of the key in bytes
 * @returns Hex-encoded string representation of the key
 */
export function generateEncryptionKey(length: number = 32): string {
  if (length < 16) {
    throw new Error("Key length must be at least 16 bytes for security");
  }
  return randomBytes(length).toString("hex");
}

/**
 * Hash data with a non-reversible hash function (for non-password data)
 *
 * @param data - String data to hash
 * @param salt - Optional salt for hashing
 * @returns Hashed string in base64 format
 */
export function hashData(data: string, salt?: string): string {
  // Use provided salt or default
  const hashSalt = salt || "static-salt-for-hash";

  // Create HMAC with SHA-256
  const hmac = createHmac("sha256", hashSalt);
  hmac.update(data);
  return hmac.digest("base64");
}

/**
 * Creates a cryptographic signature for data validation
 *
 * @param args - Object containing data and secretKey
 * @param args.data - String or object data to sign
 * @param args.secretKey - Secret key used for signing
 * @param args.options - Signature creation options
 * @returns Signature string in the specified format
 */
export function createSignature(args: {
  data: string | Data;
  secretKey: Buffer;
  options?: SignatureOptions;
}): string {
  if (!args.data) {
    throw new Error("Data is required for signature creation");
  }

  if (!args.secretKey || args.secretKey.length < 16) {
    throw new Error("A secure secret key is required for signature creation");
  }

  const { data, secretKey } = args;
  const options = { ...DEFAULT_SIGNATURE_OPTIONS, ...args.options };

  // Create a copy of the data if it's an object, with potential timestamp
  let dataWithTimestamp: string | Data;
  if (typeof data === "string") {
    dataWithTimestamp = data;
  } else {
    dataWithTimestamp = { ...data };

    // Add timestamp if requested
    if (options.addTimestamp) {
      dataWithTimestamp.__timestamp = Date.now();
    }
  }

  // Serialize the data
  const str =
    typeof dataWithTimestamp === "string"
      ? dataWithTimestamp
      : serialize(dataWithTimestamp);

  // Create HMAC with the selected algorithm
  const hmac = createHmac(options.algorithm!, secretKey);
  hmac.update(str);
  return hmac.digest(options.format!);
}

/**
 * Verifies a cryptographic signature
 *
 * @param args - Object containing data, signature, and secretKey
 * @param args.data - String or object data that was signed
 * @param args.signature - Signature to verify
 * @param args.secretKey - Secret key used for signing
 * @param args.options - Signature verification options
 * @returns Boolean indicating whether signature is valid
 */
export function verifySignature(args: {
  data: string | Data;
  signature: string;
  secretKey: Buffer;
  options?: SignatureOptions;
}): boolean {
  if (!args.data || !args.signature || !args.secretKey) {
    return false;
  }

  const { data, signature, secretKey } = args;
  const options = { ...DEFAULT_SIGNATURE_OPTIONS, ...args.options };

  try {
    // Extract timestamp if it exists in data object
    let timestamp: number | undefined;
    const dataForVerification: string | Data =
      typeof data === "string" ? data : { ...data };

    if (typeof data !== "string" && options.addTimestamp && data.__timestamp) {
      timestamp = data.__timestamp as number;

      // Validate timestamp if maxAge is specified
      if (options.verifyMaxAge && timestamp) {
        const now = Date.now();
        if (now - timestamp > options.verifyMaxAge) {
          return false; // Signature has expired
        }
      }
    }

    // Create valid signature for comparison
    const validSignature = createSignature({
      data: dataForVerification,
      secretKey,
      options,
    });

    // Convert strings to buffers for timingSafeEqual
    const validBuffer = Buffer.from(validSignature, options.format || "base64");
    const signatureBuffer = Buffer.from(signature, options.format || "base64");

    // Ensure buffers are the same length (required by timingSafeEqual)
    if (validBuffer.length !== signatureBuffer.length) {
      return false;
    }

    // Use Node.js's native timing-safe comparison
    return timingSafeEqual(validBuffer, signatureBuffer);
  } catch (error) {
    // Silently return false for any errors
    return false;
  }
}

/**
 * Serializes data to a consistent string representation
 * Ensures the same data always produces the same string
 *
 * @param data - Object to be serialized
 * @returns Consistent string representation of the data
 */
export function serialize(data: Data): string {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid data for serialization");
  }

  try {
    // Sort keys to ensure consistent output
    const orderedData = Object.keys(data)
      .sort()
      .reduce((obj: Data, key) => {
        const value = data[key];

        // Handle special cases for consistent serialization
        if (value === undefined) {
          return obj; // Skip undefined values
        }

        if (value === null) {
          obj[key] = null;
        } else if (typeof value === "object") {
          // Recursively serialize nested objects
          if (value === null) {
            obj[key] = null;
          } else if (Array.isArray(value)) {
            // Handle arrays
            obj[key] = value;
          } else {
            // Handle nested objects
            obj[key] = value;
          }
        } else {
          obj[key] = value;
        }

        return obj;
      }, {});

    // Use stable JSON stringification for consistent output
    return JSON.stringify(
      Object.keys(orderedData)
        .sort()
        .map((key) => [key, orderedData[key]])
    );
  } catch (error) {
    throw new Error(`Failed to serialize data: ${(error as Error).message}`);
  }
}
