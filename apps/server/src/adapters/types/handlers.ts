/**
 * Framework-agnostic request and response types
 */

export interface Request {
  body: any;
  query: Record<string, string>;
  params: Record<string, string>;
  headers: Record<string, string>;
  method: string;
  url: string;
  ip?: string;
  user?: any;
}

export interface Response {
  status(code: number): Response;
  json(data: any): void;
  send(data: string): void;
  setHeader(name: string, value: string): void;
}

export type RequestHandler = (req: Request, res: Response, next?: () => void) => void | Promise<void>;
export type ErrorHandler = (err: Error, req: Request, res: Response, next?: () => void) => void | Promise<void>;
