import { CookieOptions } from 'express';

declare module 'express' {
  export interface Request {
    user?: {
      id: string;
      [key: string]: unknown;
    };
    token?: string;
    cookies: {
      refreshToken?: string;
      [key: string]: string | undefined;
    };
  }

  export interface Response {
    cookie(name: string, value: string, options: CookieOptions): this;
  }
} 