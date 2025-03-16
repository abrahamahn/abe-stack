import 'express';

// Augment Express Request interface
declare module 'express' {
  export interface Request {
    user?: {
      userId: string;
      role: string;
      [key: string]: unknown;
    };
    token?: string;
  }
}