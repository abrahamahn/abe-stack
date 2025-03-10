declare module 'pg' {
  export interface PoolConfig {
    user?: string;
    password?: string;
    host?: string;
    port?: number;
    database?: string;
    ssl?: boolean | { rejectUnauthorized: boolean };
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  }

  export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
    command: string;
    oid: number;
    fields: FieldDef[];
  }

  export interface FieldDef {
    name: string;
    tableID: number;
    columnID: number;
    dataTypeID: number;
    dataTypeSize: number;
    dataTypeModifier: number;
    format: string;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
    query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
  }

  export class PoolClient {
    release(err?: Error): void;
    query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
  }

  export class DatabaseError extends Error {
    code: string;
    detail?: string;
    table?: string;
    constraint?: string;
    constructor(message: string);
  }
}

declare module 'ws' {
  export class WebSocketServer {
    constructor(options: any);
    on(event: string, callback: Function): void;
    clients: Set<any>;
  }
}

declare module 'express' {
  export interface Request {
    method: string;
    path: string;
    query: any;
    params: any;
    body: any;
    headers: any;
    cookies: any;
    user?: any;
    token?: string;
  }

  export interface Response {
    status(code: number): this;
    json(body: any): void;
    cookie(name: string, value: string, options?: any): void;
    clearCookie(name: string, options?: any): void;
  }

  export type NextFunction = (error?: any) => void;
  export type ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => Response | void | Promise<Response | void>;
  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => any;

  export interface Express {
    use(path: string | ErrorRequestHandler | RequestHandler, ...handlers: (ErrorRequestHandler | RequestHandler)[]): Express;
    get(path: string, ...handlers: RequestHandler[]): Express;
    post(path: string, ...handlers: RequestHandler[]): Express;
    put(path: string, ...handlers: RequestHandler[]): Express;
    delete(path: string, ...handlers: RequestHandler[]): Express;
  }

  export default function express(): Express;
}

declare module 'cors' {
  export default function cors(options?: any): any;
}

declare module 'cookie-parser' {
  export default function cookieParser(): any;
} 