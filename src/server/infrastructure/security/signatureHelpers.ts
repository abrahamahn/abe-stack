/**
 * Signature Helpers
 *
 * Utilities for generating and validating cryptographic signatures
 * used for secure URLs and data verification.
 */

import { createHash, randomBytes } from "crypto";

/**
 * Signature result object
 */
export interface SecuritySignature {
  signature: string;
  timestamp?: number;
  expiresAt?: number;
  nonce?: string;
}

/**
 * Options for signature generation
 */
export interface SignatureOptions {
  data: string | object;
  secretKey: string | Buffer;
  algorithm?: string;
  ttl?: number;
  outputFormat?: "hex" | "base64";
}

/**
 * Options for string-based signature operations (used by tests)
 */
export interface StringSignatureOptions {
  algorithm?: string;
  format?: "hex" | "base64";
  addTimestamp?: boolean;
  verifyMaxAge?: number;
}

/**
 * Options for object signature generation
 */
export interface ObjectSignatureOptions {
  includeTimestamp?: boolean;
  includeNonce?: boolean;
  maxAge?: number;
}

/**
 * Parsed signature components
 */
export interface ParsedSignature {
  signature: string;
  timestamp?: number;
  nonce?: string;
}

/**
 * Generate a cryptographic signature for data
 */
export function createSignature({
  data,
  secretKey,
  algorithm = "sha256",
  ttl,
  outputFormat = "hex",
  options,
}: SignatureOptions & { options?: StringSignatureOptions }): string {
  // Handle options parameter for backward compatibility
  const finalAlgorithm = options?.algorithm || algorithm;
  const finalOutputFormat = options?.format || outputFormat;

  const timestamp = Date.now();
  const expiresAt = ttl ? timestamp + ttl * 1000 : undefined;

  const dataToSign = typeof data === "string" ? data : JSON.stringify(data);
  let signatureData = dataToSign;

  // Add timestamp if requested in options
  if (options?.addTimestamp) {
    signatureData += `:${timestamp}`;
  } else {
    // Original behavior for backward compatibility
    const timestampStr = timestamp.toString();
    const expiresAtStr = expiresAt?.toString() || "";
    signatureData = `${dataToSign}:${timestampStr}:${expiresAtStr}`;
  }

  const hash = createHash(finalAlgorithm);
  hash.update(signatureData);
  hash.update(secretKey.toString());

  return hash.digest(finalOutputFormat);
}

/**
 * Generate a signature with flexible options (used by fileHelpers and tests)
 */
export function generateSignature(
  secretKey: string | Buffer,
  data: string | object,
  options: ObjectSignatureOptions & { algorithm?: string } = {},
  returnAsString: boolean = false
): string | SecuritySignature {
  const {
    includeTimestamp = false,
    includeNonce = false,
    maxAge,
    algorithm = "sha256",
  } = options;

  const timestamp = includeTimestamp ? Date.now() : undefined;
  const nonce = includeNonce ? randomBytes(16).toString("hex") : undefined;
  const expiresAt = timestamp && maxAge ? timestamp + maxAge : undefined;

  // Create the data to sign
  const dataToSign = typeof data === "string" ? data : JSON.stringify(data);
  let signatureData = dataToSign;

  if (timestamp) {
    signatureData += `:${timestamp}`;
  }
  if (nonce) {
    signatureData += `:${nonce}`;
  }
  if (expiresAt) {
    signatureData += `:${expiresAt}`;
  }

  const hash = createHash(algorithm);
  hash.update(signatureData);
  hash.update(secretKey.toString());
  const signature = hash.digest("hex");

  if (returnAsString) {
    return signature;
  }

  const result: SecuritySignature = { signature };
  if (timestamp) result.timestamp = timestamp;
  if (expiresAt) result.expiresAt = expiresAt;
  if (nonce) result.nonce = nonce;

  return result;
}

/**
 * Verify a signature against data
 */
export function verifySignature({
  data,
  signature,
  secretKey,
  algorithm,
  outputFormat,
  options,
}: {
  data: string | object;
  signature: string;
  secretKey: string | Buffer;
  algorithm?: string;
  outputFormat?: "hex" | "base64";
  options?: StringSignatureOptions;
}): boolean;
export function verifySignature(
  secretKey: string | Buffer,
  signature: string | SecuritySignature,
  data: string | object,
  options?: ObjectSignatureOptions
): boolean;
export function verifySignature(
  secretKeyOrOptions:
    | string
    | Buffer
    | {
        data: string | object;
        signature: string;
        secretKey: string | Buffer;
        algorithm?: string;
        outputFormat?: "hex" | "base64";
        options?: StringSignatureOptions;
      },
  signature?: string | SecuritySignature,
  data?: string | object,
  options?: ObjectSignatureOptions
): boolean {
  try {
    // Handle the first overload (object parameter)
    if (
      typeof secretKeyOrOptions === "object" &&
      "data" in secretKeyOrOptions
    ) {
      const {
        data,
        signature,
        secretKey,
        algorithm = "sha256",
        outputFormat = "hex",
        options,
      } = secretKeyOrOptions;

      // Check for expiration if verifyMaxAge is provided
      if (options?.addTimestamp && options?.verifyMaxAge) {
        // Extract timestamp from signature (assuming it's appended)
        const parts = signature.split(":");
        if (parts.length > 1) {
          const timestamp = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(timestamp)) {
            const now = Date.now();
            if (now - timestamp > options.verifyMaxAge) {
              return false; // Signature has expired
            }
          }
        }
      }

      const computedSignature = createSignature({
        data,
        secretKey,
        algorithm,
        outputFormat,
        options,
      });
      return computedSignature === signature;
    }

    // Handle the second overload (separate parameters)
    const secretKey = secretKeyOrOptions as string | Buffer;
    const sig = signature as string | SecuritySignature;
    const dataToVerify = data as string | object;
    const opts = options || {};

    if (typeof sig === "string") {
      // Simple string signature
      const computedSignature = generateSignature(
        secretKey,
        dataToVerify,
        opts,
        true
      ) as string;
      return computedSignature === sig;
    } else {
      // SecuritySignature object
      const {
        includeTimestamp = !!sig.timestamp,
        includeNonce = !!sig.nonce,
        maxAge,
      } = opts;

      // Check expiration if timestamp and maxAge are provided
      if (sig.timestamp && maxAge) {
        const now = Date.now();
        if (now > sig.timestamp + maxAge) {
          return false;
        }
      }

      const computedSig = generateSignature(
        secretKey,
        dataToVerify,
        {
          includeTimestamp,
          includeNonce,
          maxAge,
        },
        false
      ) as SecuritySignature;

      return computedSig.signature === sig.signature;
    }
  } catch (error: unknown) {
    return false;
  }
}

/**
 * Parse a signature string into components
 */
export function parseSignature(signatureStr: string): ParsedSignature {
  const parts = signatureStr.split(".");

  const result: ParsedSignature = {
    signature: parts[0],
  };

  if (parts.length > 1 && parts[1]) {
    result.timestamp = parseInt(parts[1], 10);
  }

  if (parts.length > 2 && parts[2]) {
    result.nonce = parts[2];
  }

  return result;
}

/**
 * Serialize a signature object to a Base64 string
 */
export function serializeSignature(signature: SecuritySignature): string {
  return Buffer.from(JSON.stringify(signature)).toString("base64");
}

/**
 * Deserialize a Base64 string back to a signature object
 */
export function deserializeSignature(serialized: string): SecuritySignature {
  try {
    const decoded = Buffer.from(serialized, "base64").toString();
    const parsed = JSON.parse(decoded);

    if (!parsed || typeof parsed !== "object" || !parsed.signature) {
      return {
        signature: undefined as any,
        timestamp: undefined,
        expiresAt: undefined,
        nonce: undefined,
      };
    }

    return {
      signature: parsed.signature,
      timestamp: parsed.timestamp,
      expiresAt: parsed.expiresAt,
      nonce: parsed.nonce,
    };
  } catch (error: unknown) {
    // If it's a JSON parse error or base64 decode error, throw
    if (
      error instanceof Error &&
      (error.message.includes("Unexpected") ||
        error.message.includes("Invalid"))
    ) {
      throw new Error(`Failed to deserialize signature: ${error.message}`);
    }
    // For other errors, return undefined signature
    return {
      signature: undefined as any,
      timestamp: undefined,
      expiresAt: undefined,
      nonce: undefined,
    };
  }
}
