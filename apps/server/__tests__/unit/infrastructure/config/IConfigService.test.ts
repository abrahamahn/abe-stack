import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  ConfigSchema,
  ValidatedConfig,
} from "@/server/infrastructure/config/ConfigSchema";
import { IConfigService } from "@/server/infrastructure/config/IConfigService";

/**
 * Test implementation of IConfigService
 */
class TestConfigService implements IConfigService {
  private config: Map<string, unknown> = new Map();
  private errors: string[] = [];
  private watchers: Map<string, Set<(value: unknown) => void>> = new Map();
  private isProd = false;
  private isDev = true;
  private _isTest = true;

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  get<T>(key: string): T {
    return this.config.get(key) as T;
  }

  getWithDefault<T>(key: string, defaultValue: T): T {
    return (this.config.get(key) as T) ?? defaultValue;
  }

  getNumber(key: string, defaultValue?: number): number {
    return (this.config.get(key) as number) ?? defaultValue ?? 0;
  }

  getBoolean(key: string, defaultValue?: boolean): boolean {
    return (this.config.get(key) as boolean) ?? defaultValue ?? false;
  }

  getString(key: string, defaultValue?: string): string {
    return (this.config.get(key) as string) ?? defaultValue ?? "";
  }

  getArray<T>(key: string, defaultValue?: T[]): T[] {
    return (this.config.get(key) as T[]) ?? defaultValue ?? [];
  }

  getObject<T>(key: string, defaultValue?: T): T {
    return (this.config.get(key) as T) ?? defaultValue ?? ({} as T);
  }

  isProduction(): boolean {
    return this.isProd;
  }

  isDevelopment(): boolean {
    return this.isDev;
  }

  isTest(): boolean {
    return this._isTest;
  }

  ensureValid(schema: ConfigSchema): void {
    // Simulate validation
    const requiredFields = Object.entries(schema.properties)
      .filter(([_, field]) => field.required)
      .map(([key]) => key);

    const missing = requiredFields.filter((key) => !this.config.has(key));
    if (missing.length > 0) {
      this.errors.push(`Missing required keys: ${missing.join(", ")}`);
    }
  }

  validate(schema: ConfigSchema): ValidatedConfig {
    this.ensureValid(schema);
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      values: this.toObject(),
    };
  }

  getErrors(): string[] {
    return this.errors;
  }

  clearErrors(): void {
    this.errors = [];
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getConfig(): Record<string, unknown> {
    return this.toObject();
  }

  set(key: string, value: unknown): void {
    this.config.set(key, value);
    this.notifyWatchers(key, value);
  }

  setMultiple(entries: Record<string, unknown>): void {
    Object.entries(entries).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  delete(key: string): void {
    this.config.delete(key);
  }

  deleteMultiple(keys: string[]): void {
    keys.forEach((key) => this.delete(key));
  }

  clear(): void {
    this.config.clear();
  }

  has(key: string): boolean {
    return this.config.has(key);
  }

  getKeys(): string[] {
    return Array.from(this.config.keys());
  }

  getValues(): unknown[] {
    return Array.from(this.config.values());
  }

  getEntries(): [string, unknown][] {
    return Array.from(this.config.entries());
  }

  getSize(): number {
    return this.config.size;
  }

  isEmpty(): boolean {
    return this.config.size === 0;
  }

  clone(): Record<string, unknown> {
    return this.toObject();
  }

  merge(other: Record<string, unknown>): void {
    Object.entries(other).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  diff(other: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    this.config.forEach((value, key) => {
      if (!(key in other) || other[key] !== value) {
        result[key] = value;
      }
    });
    return result;
  }

  equals(other: Record<string, unknown>): boolean {
    return JSON.stringify(this.toObject()) === JSON.stringify(other);
  }

  toString(): string {
    return JSON.stringify(this.toObject());
  }

  toJSON(): string {
    return this.toString();
  }

  fromJSON(json: string): void {
    const obj = JSON.parse(json);
    this.fromObject(obj);
  }

  toObject(): Record<string, unknown> {
    return Object.fromEntries(this.config);
  }

  fromObject(obj: Record<string, unknown>): void {
    this.config = new Map(Object.entries(obj));
  }

  reset(): void {
    this.clear();
    this.clearErrors();
  }

  async reload(): Promise<void> {
    // Simulate reload
    return Promise.resolve();
  }

  watch(key: string, callback: (value: unknown) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    this.watchers.get(key)!.add(callback);
    return () => this.unwatch(key, callback);
  }

  unwatch(key: string, callback: (value: unknown) => void): void {
    this.watchers.get(key)?.delete(callback);
  }

  unwatchAll(): void {
    this.watchers.clear();
  }

  private notifyWatchers(key: string, value: unknown): void {
    this.watchers.get(key)?.forEach((callback) => callback(value));
  }
}

describe("IConfigService Interface", () => {
  let configService: TestConfigService;

  beforeEach(() => {
    configService = new TestConfigService();
  });

  describe("Basic Operations", () => {
    it("should set and get values", () => {
      configService.set("test", "value");
      expect(configService.get("test")).toBe("value");
    });

    it("should handle default values", () => {
      expect(configService.getWithDefault("missing", "default")).toBe(
        "default",
      );
      configService.set("existing", "value");
      expect(configService.getWithDefault("existing", "default")).toBe("value");
    });

    it("should handle different value types", () => {
      configService.set("string", "text");
      configService.set("number", 42);
      configService.set("boolean", true);
      configService.set("array", [1, 2, 3]);
      configService.set("object", { key: "value" });

      expect(configService.getString("string")).toBe("text");
      expect(configService.getNumber("number")).toBe(42);
      expect(configService.getBoolean("boolean")).toBe(true);
      expect(configService.getArray("array")).toEqual([1, 2, 3]);
      expect(configService.getObject("object")).toEqual({ key: "value" });
    });
  });

  describe("Environment Detection", () => {
    it("should correctly report environment", () => {
      expect(configService.isProduction()).toBe(false);
      expect(configService.isDevelopment()).toBe(true);
      expect(configService.isTest()).toBe(true);
    });
  });

  describe("Validation", () => {
    it("should validate configuration", () => {
      const schema: ConfigSchema = {
        properties: {
          required_key: {
            type: "string",
            required: true,
          },
        },
      };

      // When validating with missing required fields, it should add errors
      configService.ensureValid(schema);
      expect(configService.hasErrors()).toBe(true);

      // After setting the required field and validating again, there should be no new errors
      // But the old errors remain until cleared
      configService.set("required_key", "value");
      configService.ensureValid(schema);

      // Clear errors and validate again to verify no new errors
      configService.clearErrors();
      configService.ensureValid(schema);
      expect(configService.hasErrors()).toBe(false);
    });

    it("should clear errors", () => {
      configService.set("error", "test");
      configService.ensureValid({
        properties: {
          missing: {
            type: "string",
            required: true,
          },
        },
      });
      expect(configService.hasErrors()).toBe(true);
      configService.clearErrors();
      expect(configService.hasErrors()).toBe(false);
    });

    it("should return errors with getErrors", () => {
      const schema: ConfigSchema = {
        properties: {
          required_key: {
            type: "string",
            required: true,
          },
        },
      };

      configService.ensureValid(schema);
      const errors = configService.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/Missing required keys/);
    });
  });

  describe("Collection Operations", () => {
    it("should handle multiple entries", () => {
      configService.setMultiple({
        key1: "value1",
        key2: "value2",
      });

      expect(configService.getKeys()).toEqual(["key1", "key2"]);
      expect(configService.getValues()).toEqual(["value1", "value2"]);
      expect(configService.getSize()).toBe(2);
      expect(configService.isEmpty()).toBe(false);
    });

    it("should handle deletion", () => {
      configService.setMultiple({
        key1: "value1",
        key2: "value2",
      });

      configService.delete("key1");
      expect(configService.has("key1")).toBe(false);
      expect(configService.has("key2")).toBe(true);

      configService.deleteMultiple(["key2"]);
      expect(configService.isEmpty()).toBe(true);
    });
  });

  describe("Data Transformation", () => {
    it("should handle JSON operations", () => {
      const data = { key: "value" };
      configService.fromObject(data);
      expect(configService.toObject()).toEqual(data);
      expect(configService.toString()).toBe(JSON.stringify(data));
      expect(configService.toJSON()).toBe(JSON.stringify(data));
    });

    it("should handle cloning and merging", () => {
      configService.set("key1", "value1");
      const clone = configService.clone();
      expect(clone).toEqual({ key1: "value1" });

      configService.merge({ key2: "value2" });
      expect(configService.toObject()).toEqual({
        key1: "value1",
        key2: "value2",
      });
    });

    it("should handle diff and equals", () => {
      configService.set("key1", "value1");
      configService.set("key2", "value2");

      const other = { key1: "value1", key2: "different" };
      expect(configService.diff(other)).toEqual({ key2: "value2" });
      expect(configService.equals(other)).toBe(false);

      configService.set("key2", "different");
      expect(configService.equals(other)).toBe(true);
    });

    it("should handle fromJSON operation", () => {
      const data = { test: "value", number: 42 };
      const json = JSON.stringify(data);

      configService.fromJSON(json);

      expect(configService.get("test")).toBe("value");
      expect(configService.get("number")).toBe(42);
    });
  });

  describe("Watch Operations", () => {
    it("should handle watching values", () => {
      const callback = vi.fn();
      const unwatch = configService.watch("test", callback);

      configService.set("test", "new value");
      expect(callback).toHaveBeenCalledWith("new value");

      unwatch();
      configService.set("test", "another value");
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple watchers", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      configService.watch("test", callback1);
      configService.watch("test", callback2);

      configService.set("test", "value");
      expect(callback1).toHaveBeenCalledWith("value");
      expect(callback2).toHaveBeenCalledWith("value");
    });

    it("should handle unwatchAll", () => {
      const callback = vi.fn();
      configService.watch("test", callback);

      configService.unwatchAll();
      configService.set("test", "value");
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("Lifecycle Methods", () => {
    it("should initialize successfully", async () => {
      // Since our test implementation just returns a resolved promise
      // we're mostly verifying the method exists and returns a promise
      const initPromise = configService.initialize();
      expect(initPromise).toBeInstanceOf(Promise);
      await expect(initPromise).resolves.toBeUndefined();
    });

    it("should reset the configuration", () => {
      // Set some values and errors
      configService.set("key", "value");
      configService.ensureValid({
        properties: {
          required: {
            type: "string",
            required: true,
          },
        },
      });

      // Verify we have content to reset
      expect(configService.get("key")).toBe("value");
      expect(configService.hasErrors()).toBe(true);

      // Reset should clear both values and errors
      configService.reset();

      expect(configService.has("key")).toBe(false);
      expect(configService.isEmpty()).toBe(true);
      expect(configService.hasErrors()).toBe(false);
    });

    it("should reload configuration", async () => {
      // Set some initial values
      configService.set("key", "value");

      // Our implementation doesn't actually reload anything but we want
      // to test the method exists and returns a promise
      const reloadPromise = configService.reload();
      expect(reloadPromise).toBeInstanceOf(Promise);
      await expect(reloadPromise).resolves.toBeUndefined();
    });
  });

  describe("Utility Methods", () => {
    it("should return the complete configuration with getConfig", () => {
      // Set some test data
      configService.set("key1", "value1");
      configService.set("key2", 42);

      const config = configService.getConfig();

      expect(config).toEqual({
        key1: "value1",
        key2: 42,
      });
    });
  });
});
