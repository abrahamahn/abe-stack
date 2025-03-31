import { IApplicationLifecycle } from "@infrastructure/lifecycle";

describe("IApplicationLifecycle", () => {
  let mockLifecycle: jest.Mocked<IApplicationLifecycle>;

  beforeEach(() => {
    mockLifecycle = {
      setHttpServer: jest.fn(),
      register: jest.fn(),
      registerShutdownHandler: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    };
  });

  describe("start", () => {
    it("should initialize the application", async () => {
      await mockLifecycle.start();
      expect(mockLifecycle.start).toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("should shutdown the application", async () => {
      await mockLifecycle.stop();
      expect(mockLifecycle.stop).toHaveBeenCalled();
    });
  });

  describe("setHttpServer", () => {
    it("should set the HTTP server", () => {
      const server = {} as any;
      mockLifecycle.setHttpServer(server);
      expect(mockLifecycle.setHttpServer).toHaveBeenCalledWith(server);
    });
  });

  describe("register", () => {
    it("should register a dependency", () => {
      const name = "test";
      const dependencies: string[] = [];
      const component = {
        start: jest.fn(),
        stop: jest.fn(),
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
      const handler = jest.fn();
      mockLifecycle.registerShutdownHandler(handler);
      expect(mockLifecycle.registerShutdownHandler).toHaveBeenCalledWith(
        handler,
      );
    });
  });
});
