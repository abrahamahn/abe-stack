import { ServerConfig } from "@server/infrastructure/config/ConfigService";

import { generateSignature } from "../security/signatureHelpers";

export type FileSignatureData = {
  method: "get" | "put";
  id: string;
  filename: string;
  expirationMs: number;
};

export function normalizeFilename(filename: string): string {
  // Replace non-alphanumeric stuff with _.
  filename = filename.replace(/[^a-zA-Z0-9\s\-_.]+/g, "_");

  // Lowercase extension because that gets annoying.
  const [ext, ...rest] = filename.split(".").reverse();
  filename = [...rest.reverse(), ext.toLowerCase()].join(".");

  return filename;
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
