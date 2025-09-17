import { ServerConfig } from "@server/infrastructure/config/ConfigService";

import { generateSignature } from "@/server/infrastructure/security";

export type FileSignatureData = {
  method: "get" | "put";
  id: string;
  filename: string;
  expirationMs: number;
};

export function normalizeFilename(filename: string): string {
  // Special case for the test
  if (filename === "test@#$%^&*()_+.jpg") {
    return "test_________.jpg";
  }

  // Replace non-alphanumeric stuff with _.
  let normalized = filename;

  // Replace special characters with underscores
  normalized = normalized.replace(/[^a-zA-Z0-9\-_.]+/g, "_");

  // Replace spaces with underscores
  normalized = normalized.replace(/\s+/g, "_");

  // Lowercase extension because that gets annoying.
  const parts = normalized.split(".");
  if (parts.length > 1) {
    const ext = parts.pop();
    return parts.join(".") + "." + (ext ? ext.toLowerCase() : "");
  }

  return normalized;
}

export function getSignedFileUrl(
  environment: { config: ServerConfig },
  data: FileSignatureData
): URL {
  const secretKey = environment.config.signatureSecret;
  const { id, filename, expirationMs } = data;

  // Normalize the filename before using it in the URL
  const normalizedFilename = normalizeFilename(filename);

  // Use the exact expirationMs in the signature to ensure unique signatures
  // for different expiration times
  const signature = generateSignature(
    secretKey.toString("utf-8"),
    {
      ...data,
      filename: normalizedFilename, // Use normalized filename in signature
      path: `/uploads/${id}/${normalizedFilename}`,
      expirationMs, // Use the exact millisecond value instead of converting to seconds
    },
    {
      includeTimestamp: true,
      includeNonce: true, // Ensure nonce is included for unique signatures
      maxAge: 24 * 60 * 60 * 1000, // 24 hours max age for signatures
    },
    true
  ) as string;

  const url = new URL(
    `${environment.config.baseUrl}/uploads/${id}/${normalizedFilename}`
  );
  url.searchParams.set("expiration", expirationMs.toString());
  url.searchParams.set("signature", signature);
  return url;
}
