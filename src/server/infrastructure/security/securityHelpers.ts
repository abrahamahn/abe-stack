import { createHmac, timingSafeEqual, randomBytes } from "crypto";

type Data = {
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

  const str =
    typeof dataWithTimestamp === "string"
      ? dataWithTimestamp
      : serialize(dataWithTimestamp);
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
  const { data, signature, secretKey } = args;
  const options = { ...DEFAULT_SIGNATURE_OPTIONS, ...args.options };

  try {
    // Extract timestamp if it exists in data object
    let timestamp: number | undefined;
    const dataForVerification: string | Data = data;

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

    const validSignature = createSignature({
      data: dataForVerification,
      secretKey,
      options,
    });

    // Convert strings to buffers for timingSafeEqual
    const validBuffer = Buffer.from(validSignature, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    // Ensure buffers are the same length (required by timingSafeEqual)
    if (validBuffer.length !== signatureBuffer.length) {
      return false;
    }

    // Use Node.js's native timing-safe comparison
    return timingSafeEqual(validBuffer, signatureBuffer);
  } catch (error) {
    console.error("Error verifying signature:", error);
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
function serialize(data: Data): string {
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
          // Recursively serialize objects
          obj[key] = value;
        } else {
          obj[key] = value;
        }

        return obj;
      }, {});

    // Use stable JSON stringification
    return JSON.stringify(
      Object.keys(orderedData)
        .sort()
        .map((key) => [key, orderedData[key]]),
    );
  } catch (error) {
    console.error("Error serializing data:", error);
    throw new Error("Failed to serialize data for signature");
  }
}

/**
 * Options for CSRF token generation
 */
export interface CsrfOptions {
  /** Token expiration in milliseconds (default: 1 hour) */
  expiryMs?: number;

  /** Whether to include the user agent in the token validation */
  includeUserAgent?: boolean;

  /** Whether to include the origin/referer in the token validation */
  includeOrigin?: boolean;
}

/**
 * Default CSRF options
 */
export const DEFAULT_CSRF_OPTIONS: CsrfOptions = {
  expiryMs: 3600000, // 1 hour
  includeUserAgent: true,
  includeOrigin: true,
};

/**
 * CSRF token payload structure
 */
export interface CsrfPayload {
  /** Session ID the token is bound to */
  sessionId: string;

  /** Timestamp when token was created */
  timestamp: number;

  /** Browser user agent (if enabled) */
  userAgent?: string;

  /** Origin or referrer URL (if enabled) */
  origin?: string;

  /** Random nonce to prevent token reuse */
  nonce: string;
}

/**
 * Generate a CSRF token for protecting against CSRF attacks
 *
 * @param sessionId - The user's session ID to bind the token to
 * @param secretKey - Secret key used for signing
 * @param options - CSRF token generation options
 * @param context - Additional context like user agent and origin
 * @returns A CSRF token string that can be included in forms
 */
export function generateCsrfToken(
  sessionId: string,
  secretKey: Buffer,
  options: CsrfOptions = DEFAULT_CSRF_OPTIONS,
  context?: { userAgent?: string; origin?: string },
): string {
  // Create the token payload
  const payload: CsrfPayload = {
    sessionId,
    timestamp: Date.now(),
    nonce: randomBytes(16).toString("hex"),
  };

  // Include user agent if requested and available
  if (options.includeUserAgent && context?.userAgent) {
    payload.userAgent = context.userAgent;
  }

  // Include origin if requested and available
  if (options.includeOrigin && context?.origin) {
    payload.origin = context.origin;
  }

  // Create the serialized payload - convert to Data type by treating as unknown first
  const serializedPayload = serialize(payload as unknown as Data);

  // Create a signature for the payload
  const hmac = createHmac("sha256", secretKey);
  hmac.update(serializedPayload);
  const signature = hmac.digest("base64");

  // Combine payload and signature to create the token
  const token = Buffer.from(
    JSON.stringify({
      payload,
      signature,
    }),
  ).toString("base64");

  return token;
}

/**
 * Verify a CSRF token
 *
 * @param token - The CSRF token to verify
 * @param sessionId - The current user session ID
 * @param secretKey - Secret key used for signing
 * @param options - CSRF token verification options
 * @param context - Additional context like user agent and origin
 * @returns Boolean indicating whether the token is valid
 */
export function verifyCsrfToken(
  token: string,
  sessionId: string,
  secretKey: Buffer,
  options: CsrfOptions = DEFAULT_CSRF_OPTIONS,
  context?: { userAgent?: string; origin?: string },
): boolean {
  try {
    // Parse the token
    const parsed = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    const { payload, signature } = parsed;

    // Validate the token content
    if (
      !payload ||
      !signature ||
      !payload.sessionId ||
      !payload.timestamp ||
      !payload.nonce
    ) {
      return false;
    }

    // Verify token is for the correct session
    if (payload.sessionId !== sessionId) {
      return false;
    }

    // Check if token has expired
    const now = Date.now();
    const expiryMs = options.expiryMs || DEFAULT_CSRF_OPTIONS.expiryMs;
    if (now - payload.timestamp > expiryMs!) {
      return false;
    }

    // Verify user agent if required
    if (options.includeUserAgent && payload.userAgent && context?.userAgent) {
      if (payload.userAgent !== context.userAgent) {
        return false;
      }
    }

    // Verify origin if required
    if (options.includeOrigin && payload.origin && context?.origin) {
      if (payload.origin !== context.origin) {
        return false;
      }
    }

    // Recreate signature and verify
    const serializedPayload = serialize(payload as unknown as Data);
    const hmac = createHmac("sha256", secretKey);
    hmac.update(serializedPayload);
    const expectedSignature = hmac.digest("base64");

    // Compare signatures using timing-safe comparison
    return timingSafeEqual(
      Buffer.from(signature, "utf-8"),
      Buffer.from(expectedSignature, "utf-8"),
    );
  } catch (error) {
    console.error("Error verifying CSRF token:", error);
    return false;
  }
}
