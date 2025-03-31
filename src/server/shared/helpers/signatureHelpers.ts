import * as crypto from "crypto";

/**
 * Generates a cryptographic signature for data access security
 *
 * @param secretKey - Secret key used to sign the data
 * @param data - Object containing the data to be signed
 * @returns A hexadecimal signature string
 */
export function generateSignature(
  secretKey: string,
  data: Record<string, unknown>,
): string {
  // Create a sorted string representation of the data for consistent signatures
  const sortedData = Object.keys(data)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = data[key];
        return acc;
      },
      {} as Record<string, unknown>,
    );

  const stringToSign = JSON.stringify(sortedData);

  // Create an HMAC signature using SHA-256
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(stringToSign);

  return hmac.digest("hex");
}

/**
 * Verifies if a signature matches the expected data
 *
 * @param secretKey - Secret key used to sign the data
 * @param signature - The signature to verify
 * @param data - Object containing the data that was signed
 * @returns True if signature is valid, false otherwise
 */
export function verifySignature(
  secretKey: string,
  signature: string,
  data: Record<string, unknown>,
): boolean {
  const expectedSignature = generateSignature(secretKey, data);
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex"),
  );
}
