import * as crypto from "crypto";

/**
 * Options for generating signatures
 */
export interface SignatureOptions {
  /** Include timestamp to prevent replay attacks */
  includeTimestamp?: boolean;

  /** Maximum age of signature in milliseconds (default: 1 hour) */
  maxAge?: number;

  /** Include a nonce (number used once) for additional security */
  includeNonce?: boolean;
}

/**
 * Default signature options
 */
export const DEFAULT_SIGNATURE_OPTIONS: SignatureOptions = {
  includeTimestamp: true,
  maxAge: 60 * 60 * 1000, // 1 hour
  includeNonce: true,
};

/**
 * Security signature generated with additional metadata
 */
export interface SecuritySignature {
  /** The actual cryptographic signature */
  signature: string;

  /** Timestamp when signature was created (if enabled) */
  timestamp?: number;

  /** Nonce value to prevent replay attacks (if enabled) */
  nonce?: string;
}

/**
 * Convert a SecuritySignature to a string for transmission
 */
export function serializeSignature(
  securitySignature: SecuritySignature,
): string {
  return Buffer.from(JSON.stringify(securitySignature)).toString("base64");
}

/**
 * Parse a string back to a SecuritySignature object
 */
export function deserializeSignature(serialized: string): SecuritySignature {
  try {
    return JSON.parse(Buffer.from(serialized, "base64").toString("utf-8"));
  } catch (_error) {
    throw new Error("Invalid signature format");
  }
}

/**
 * Generates a cryptographic signature for data access security
 *
 * @param secretKey - Secret key used to sign the data
 * @param data - Object containing the data to be signed
 * @param options - Configuration options for signature generation
 * @returns A signature object or string representation
 */
export function generateSignature(
  secretKey: string,
  data: Record<string, unknown>,
  options: SignatureOptions = DEFAULT_SIGNATURE_OPTIONS,
  returnRaw: boolean = false,
): string | SecuritySignature {
  // Create a copy of the data to avoid modifying the original
  const dataToSign = { ...data };

  // Add timestamp if required
  if (options.includeTimestamp) {
    dataToSign.__timestamp = Date.now();
  }

  // Add nonce if required
  if (options.includeNonce) {
    dataToSign.__nonce = crypto.randomBytes(16).toString("hex");
  }

  // Create a sorted string representation of the data for consistent signatures
  const sortedData = Object.keys(dataToSign)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = dataToSign[key];
        return acc;
      },
      {} as Record<string, unknown>,
    );

  const stringToSign = JSON.stringify(sortedData);

  // Create an HMAC signature using SHA-256
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(stringToSign);
  const signature = hmac.digest("hex");

  if (returnRaw) {
    return signature;
  }

  // Create the security signature object
  const securitySignature: SecuritySignature = { signature };

  if (options.includeTimestamp && dataToSign.__timestamp) {
    securitySignature.timestamp = dataToSign.__timestamp as number;
  }

  if (options.includeNonce && dataToSign.__nonce) {
    securitySignature.nonce = dataToSign.__nonce as string;
  }

  return securitySignature;
}

/**
 * Verifies if a signature matches the expected data
 *
 * @param secretKey - Secret key used to sign the data
 * @param signatureData - The signature to verify (string or SecuritySignature object)
 * @param data - Object containing the data that was signed
 * @param options - Configuration options for signature verification
 * @returns True if signature is valid, false otherwise
 */
export function verifySignature(
  secretKey: string,
  signatureData: string | SecuritySignature,
  data: Record<string, unknown>,
  options: SignatureOptions = DEFAULT_SIGNATURE_OPTIONS,
): boolean {
  try {
    // Parse the signature if it's a string
    let securitySignature: SecuritySignature;
    let signature: string;

    if (typeof signatureData === "string") {
      try {
        // First, try to parse as serialized signature object
        securitySignature = deserializeSignature(signatureData);
        signature = securitySignature.signature;
      } catch {
        // If that fails, treat the string as the raw signature
        signature = signatureData;
        securitySignature = { signature };
      }
    } else {
      securitySignature = signatureData;
      signature = securitySignature.signature;
    }

    // Clone data to avoid modifying the original
    const verificationData = { ...data };

    // Validate timestamp if present and required
    if (options.includeTimestamp && securitySignature.timestamp) {
      const now = Date.now();
      const maxAge = options.maxAge || DEFAULT_SIGNATURE_OPTIONS.maxAge;

      if (now - securitySignature.timestamp > maxAge!) {
        return false; // Signature has expired
      }

      // Use existing timestamp field if already in data, otherwise add it
      if (!verificationData.__timestamp) {
        verificationData.__timestamp = securitySignature.timestamp;
      }
    }

    // Add nonce to data for verification if present
    if (options.includeNonce && securitySignature.nonce) {
      // Use existing nonce field if already in data, otherwise add it
      if (!verificationData.__nonce) {
        verificationData.__nonce = securitySignature.nonce;
      }
    }

    // Generate the expected signature
    const expectedSignature = generateSignature(
      secretKey,
      verificationData,
      options,
      true,
    ) as string;

    // Only compare if signatures have the same length - timingSafeEqual requires same-length buffers
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch (error) {
    // If anything goes wrong during verification, consider it invalid
    console.error("Signature verification error:", error);
    return false;
  }
}
