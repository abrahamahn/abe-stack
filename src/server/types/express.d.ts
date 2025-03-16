import { User } from '../models';

declare module 'express' {
  interface Request {
    user?: User;
    token?: string;
    cookies?: {
      refreshToken?: string;
      [key: string]: string | undefined;
    };
  }
}

export {};