declare module 'bull' {
  export interface JobOptions {
    attempts?: number;
    backoff?: {
      type: string;
      delay: number;
    };
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
  }

  export interface Job<T = any> {
    id: string;
    data: T;
    progress(progress: number): Promise<void>;
    finished(): Promise<any>;
  }

  export interface Queue<T = any> {
    add(data: T, opts?: JobOptions): Promise<Job<T>>;
    process(handler: (job: Job<T>) => Promise<any>): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }

  export default class Bull {
    constructor(name: string, options?: any);
    add(data: any, opts?: JobOptions): Promise<Job>;
    process(handler: (job: Job) => Promise<any>): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }
} 