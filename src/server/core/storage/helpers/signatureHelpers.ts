import crypto from "crypto";

import { FileSignatureData } from "./fileHelpers";

/**
 * Generates a signature for file access based on file data
 * @param secret Secret key for signature generation
 * @param data File data to sign
 * @returns Generated signature
 */
export function generateSignature(
  secret: Buffer,
  data: FileSignatureData,
): string {
  const expiration = data.expirationMs
    ? Math.floor(data.expirationMs / 1000)
    : data.expiration;
  const stringToSign = `${data.method || ""}:${data.path || ""}:${data.id}:${data.filename}:${expiration}`;
  return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
}

/**
 * Verifies if a signature is valid for the given file data
 * @param params Object containing the secret key, signature, and data
 * @returns Boolean indicating if signature is valid
 */
export function verifySignature(params: {
  secretKey: Buffer;
  signature: string;
  data: FileSignatureData;
}): boolean {
  const { secretKey, signature, data } = params;
  const computedSignature = generateSignature(secretKey, data);
  const currentTime = Math.floor(Date.now() / 1000);

  // Convert expiration to seconds timestamp
  let expirationTime: number;
  if (data.expirationMs) {
    expirationTime = Math.floor(data.expirationMs / 1000);
  } else if (data.expiration instanceof Date) {
    expirationTime = Math.floor(data.expiration.getTime() / 1000);
  } else {
    expirationTime = data.expiration;
  }

  // Check if signature matches and if it hasn't expired
  return (
    crypto.timingSafeEqual(
      Buffer.from(computedSignature, "hex"),
      Buffer.from(signature, "hex"),
    ) && expirationTime > currentTime
  );
}
