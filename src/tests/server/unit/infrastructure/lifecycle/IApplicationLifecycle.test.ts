import { describe, it, expect, beforeEach, vi } from "vitest";

import type { Server } from "http";

describe("IApplicationLifecycle", () => {
  let mockLifecycle: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    setHttpServer: ReturnType<typeof vi.fn>;
    registerShutdownHandler: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLifecycle = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      register: vi.fn(),
      setHttpServer: vi.fn(),
      registerShutdownHandler: vi.fn(),
    };
  });

  describe("start", () => {
    it("should initialize the application", async () => {
      await mockLifecycle.start();
      expect(mockLifecycle.start).toHaveBeenCalled();
    });

    it("should handle initialization errors", async () => {
      const error = new Error("Initialization failed");
      mockLifecycle.start = vi.fn().mockRejectedValue(error);

      await expect(mockLifecycle.start()).rejects.toThrow(error);
    });

    it("should return a promise", () => {
      const result = mockLifecycle.start();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("stop", () => {
    it("should shutdown the application", async () => {
      await mockLifecycle.stop();
      expect(mockLifecycle.stop).toHaveBeenCalled();
    });

    it("should handle shutdown errors", async () => {
      const error = new Error("Shutdown failed");
      mockLifecycle.stop = vi.fn().mockRejectedValue(error);

      await expect(mockLifecycle.stop()).rejects.toThrow(error);
    });

    it("should return a promise", () => {
      const result = mockLifecycle.stop();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("setHttpServer", () => {
    it("should set the HTTP server", () => {
      const server = {} as Server;
      mockLifecycle.setHttpServer(server);
      expect(mockLifecycle.setHttpServer).toHaveBeenCalledWith(server);
    });

    it("should handle null server", () => {
      mockLifecycle.setHttpServer(null as unknown as Server);
      expect(mockLifecycle.setHttpServer).toHaveBeenCalledWith(null);
    });
  });

  describe("register", () => {
    it("should register a dependency with start and stop methods", () => {
      const name = "test";
      const dependencies: string[] = [];
      const component = {
        start: vi.fn(),
        stop: vi.fn(),
      };
      mockLifecycle.register(name, dependencies, component);
      expect(mockLifecycle.register).toHaveBeenCalledWith(
        name,
        dependencies,
        component,
      );
    });

    it("should register a dependency with only start method", () => {
      const name = "test";
      const dependencies: string[] = [];
      const component = {
        start: vi.fn(),
      };
      mockLifecycle.register(name, dependencies, component);
      expect(mockLifecycle.register).toHaveBeenCalledWith(
        name,
        dependencies,
        component,
      );
    });

    it("should register a dependency with only stop method", () => {
      const name = "test";
      const dependencies: string[] = [];
      const component = {
        stop: vi.fn(),
      };
      mockLifecycle.register(name, dependencies, component);
      expect(mockLifecycle.register).toHaveBeenCalledWith(
        name,
        dependencies,
        component,
      );
    });

    it("should register a dependency with no methods", () => {
      const name = "test";
      const dependencies: string[] = [];
      const component = {};
      mockLifecycle.register(name, dependencies, component);
      expect(mockLifecycle.register).toHaveBeenCalledWith(
        name,
        dependencies,
        component,
      );
    });

    it("should register a dependency with multiple dependencies", () => {
      const name = "test";
      const dependencies = ["dep1", "dep2"];
      const component = {
        start: vi.fn(),
        stop: vi.fn(),
      };
      mockLifecycle.register(name, dependencies, component);
      expect(mockLifecycle.register).toHaveBeenCalledWith(
        name,
        dependencies,
        component,
      );
    });
  });

  describe("registerShutdownHandler", () => {
    it("should register a shutdown handler", () => {
      const handler = vi.fn();
      mockLifecycle.registerShutdownHandler(handler);
      expect(mockLifecycle.registerShutdownHandler).toHaveBeenCalledWith(
        handler,
      );
    });

    it("should register a handler that returns a promise", () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      mockLifecycle.registerShutdownHandler(handler);
      expect(mockLifecycle.registerShutdownHandler).toHaveBeenCalledWith(
        handler,
      );
    });

    it("should register a handler that rejects", () => {
      const handler = vi.fn().mockRejectedValue(new Error("Handler failed"));
      mockLifecycle.registerShutdownHandler(handler);
      expect(mockLifecycle.registerShutdownHandler).toHaveBeenCalledWith(
        handler,
      );
    });
  });
});
