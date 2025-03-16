import 'express';

declare module 'express' {
  // Ensure the Router is properly typed
  export interface Router {
    get: Function;
    post: Function;
    put: Function;
    delete: Function;
    patch: Function;
    options: Function;
    head: Function;
    use: Function;
  }
  
  // Enhance request with user property
  export interface Request {
    user?: {
      userId: string;
      role: string;
      [key: string]: unknown;
    };
    token?: string;
  }
}