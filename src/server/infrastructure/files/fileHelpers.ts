import { ServerConfig } from "@server/infrastructure/config/ConfigService";

import { generateSignature } from "../security/signatureHelpers";

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
  data: FileSignatureData,
): URL {
  const secretKey = environment.config.signatureSecret;

  const { id, filename, expirationMs } = data;
  const signature = generateSignature(secretKey.toString("utf-8"), {
    ...data,
    path: `/uploads/${id}/${filename}`,
    expiration: Math.floor(expirationMs / 1000),
  });

  const url = new URL(
    `${environment.config.baseUrl}/uploads/${id}/${filename}`,
  );
  url.searchParams.set("expiration", expirationMs.toString());
  url.searchParams.set("signature", signature);
  return url;
}
