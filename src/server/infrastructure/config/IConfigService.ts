import { ConfigSchema, ValidatedConfig } from "./ConfigSchema";

export interface IConfigService {
  initialize(): Promise<void>;
  get<T>(key: string): T;
  getWithDefault<T>(key: string, defaultValue: T): T;
  getNumber(key: string, defaultValue?: number): number;
  getBoolean(key: string, defaultValue?: boolean): boolean;
  getString(key: string, defaultValue?: string): string;
  getArray<T>(key: string, defaultValue?: T[]): T[];
  getObject<T>(key: string, defaultValue?: T): T;
  isProduction(): boolean;
  isDevelopment(): boolean;
  isTest(): boolean;
  ensureValid(schema: ConfigSchema): void;
  validate(schema: ConfigSchema): ValidatedConfig;
  getErrors(): string[];
  clearErrors(): void;
  hasErrors(): boolean;
  getConfig(): Record<string, unknown>;
  set(key: string, value: unknown): void;
  setMultiple(entries: Record<string, unknown>): void;
  delete(key: string): void;
  deleteMultiple(keys: string[]): void;
  clear(): void;
  has(key: string): boolean;
  getKeys(): string[];
  getValues(): unknown[];
  getEntries(): [string, unknown][];
  getSize(): number;
  isEmpty(): boolean;
  clone(): Record<string, unknown>;
  merge(other: Record<string, unknown>): void;
  diff(other: Record<string, unknown>): Record<string, unknown>;
  equals(other: Record<string, unknown>): boolean;
  toString(): string;
  toJSON(): string;
  fromJSON(json: string): void;
  toObject(): Record<string, unknown>;
  fromObject(obj: Record<string, unknown>): void;
  reset(): void;
  reload(): Promise<void>;
  watch(key: string, callback: (value: unknown) => void): () => void;
  unwatch(key: string, callback: (value: unknown) => void): void;
  unwatchAll(): void;
}
