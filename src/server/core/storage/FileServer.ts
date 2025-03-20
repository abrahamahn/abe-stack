import fs, { promises as fsPromises } from "fs";
import path from "path";

import express, {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

import { FileSignatureData } from "./helpers/fileHelpers";
import { verifySignature } from "./helpers/signatureHelpers";
import { DayS } from "../../../shared/dateHelpers";
import { ServerConfig } from "../../config/environment";

// Define interfaces for typed requests
interface FileParams {
  id: string;
  filename: string;
  [key: string]: string; // Add index signature for compatibility with ParamsDictionary
}

interface FileQueryParams {
  expiration: string;
  signature: string;
  [key: string]: string; // Add index signature for compatibility with ParsedQs
}

interface FileUploadResponse {
  message: string;
  path?: string;
}

/**
 * Type guard for the file request
 */
function isValidFileRequest(
  req: unknown,
): req is Request<FileParams, unknown, unknown, FileQueryParams> {
  if (!req || typeof req !== "object") return false;
  const typedReq = req as { params?: unknown; query?: unknown };

  if (
    !typedReq.params ||
    !typedReq.query ||
    typeof typedReq.params !== "object" ||
    typeof typedReq.query !== "object"
  ) {
    return false;
  }

  const params = typedReq.params as { id?: unknown; filename?: unknown };
  const query = typedReq.query as { expiration?: unknown; signature?: unknown };

  return (
    typeof params.id === "string" &&
    typeof params.filename === "string" &&
    typeof query.expiration === "string" &&
    typeof query.signature === "string"
  );
}

/**
 * Verify the authenticity and validity of the request
 */
function verifyRequest(
  config: ServerConfig,
  req: Request<FileParams, unknown, unknown, FileQueryParams>,
  res: Response,
): boolean {
  const typedReq = req as unknown as {
    params: FileParams;
    query: FileQueryParams;
    method: string;
  };

  if (!isValidFileRequest(req)) {
    res.status(400).json({ message: "Invalid request parameters" });
    return false;
  }

  const id = typedReq.params.id;
  const filename = typedReq.params.filename;
  const expiration = typedReq.query.expiration;
  const signature = typedReq.query.signature;

  // Validate expiration
  const expirationMs = parseInt(expiration, 10);
  if (isNaN(expirationMs)) {
    res.status(400).json({ message: "Invalid expiration format." });
    return false;
  }

  const now = Date.now();
  if (expirationMs < now) {
    res.status(400).json({ message: "Request has expired." });
    return false;
  }

  // Validate signature
  if (!signature) {
    res.status(400).json({ message: "Missing signature parameter." });
    return false;
  }

  const method = typedReq.method.toLowerCase().trim() as "get" | "put";
  const data: FileSignatureData = {
    method: method as "get" | "put",
    id,
    filename,
    expirationMs,
    path: `${id}/${filename}`,
    expiration: new Date(Date.now() + expirationMs),
  };

  const secretKey = config.signatureSecret;
  const validSignature = verifySignature({
    data,
    signature,
    secretKey,
  });

  if (!validSignature) {
    res.status(400).json({ message: "Invalid signature." });
    return false;
  }

  return true;
}

/**
 * Middleware to validate file requests
 */
function validateFileRequest(config: ServerConfig): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (
      !isValidFileRequest(
        req as Request<FileParams, unknown, unknown, FileQueryParams>,
      )
    ) {
      res.status(400).json({ message: "Invalid request parameters." });
      return;
    }

    if (
      !verifyRequest(
        config,
        req as Request<FileParams, unknown, unknown, FileQueryParams>,
        res,
      )
    ) {
      return; // Response is already sent in verifyRequest
    }

    next();
  };
}

/**
 * Setup file server routes for uploading and retrieving files
 */
export function FileServer(
  environment: { config: ServerConfig },
  app: Application,
): void {
  const uploadDir = path.resolve("uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  const MB = 1024 * 1024;
  const typedApp = app as unknown as {
    put: (path: string, ...handlers: RequestHandler[]) => void;
    get: (path: string, ...handlers: RequestHandler[]) => void;
  };

  // File upload endpoint
  typedApp.put(
    "/uploads/:id/:filename",
    (
      express.raw as unknown as (options: {
        limit: number;
        type: string;
      }) => RequestHandler
    )({
      limit: 100 * MB,
      type: "*/*",
    }),
    validateFileRequest(environment.config),
    async (req: Request, res: Response): Promise<void> => {
      if (
        !isValidFileRequest(
          req as Request<FileParams, unknown, unknown, FileQueryParams>,
        )
      ) {
        res.status(400).json({ message: "Invalid request parameters" });
        return;
      }

      // Type-safe assignments after validation
      const id = (req.params as FileParams).id;
      const filename = (req.params as FileParams).filename;

      const fileDir = path.join(uploadDir, id);
      const filePath = path.join(fileDir, filename);

      try {
        await fsPromises.mkdir(fileDir, { recursive: true });
        await fsPromises.writeFile(filePath, req.body as Buffer);
        res.status(200).json({
          message: "File uploaded successfully",
          path: filePath,
        } as FileUploadResponse);
      } catch (err) {
        const error = err as Error;
        res.status(500).json({
          message: `Upload failed: ${error.message}`,
        } as FileUploadResponse);
      }
    },
  );

  // File retrieval endpoint
  typedApp.get(
    "/uploads/:id/:filename",
    validateFileRequest(environment.config),
    async (
      req: Request,
      res: Response & {
        setHeader: (name: string, value: string) => void;
        sendFile: (path: string) => void;
      },
    ): Promise<void> => {
      if (
        !isValidFileRequest(
          req as Request<FileParams, unknown, unknown, FileQueryParams>,
        )
      ) {
        res.status(400).json({ message: "Invalid request parameters" });
        return;
      }

      // Type-safe assignments after validation
      const params = req.params as FileParams;
      const id = params.id;
      const filename = params.filename;

      const fileDir = path.join(uploadDir, id);
      const filePath = path.join(fileDir, filename);

      try {
        await fsPromises.access(filePath, fs.constants.F_OK);
        const expiration = 60 * DayS;
        res.setHeader("Cache-Control", `private, max-age=${expiration}`);
        res.sendFile(filePath);
      } catch {
        res.status(404).json({ message: "File not found." });
      }
    },
  );
}
