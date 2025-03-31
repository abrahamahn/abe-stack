import "reflect-metadata";
import { Container, injectable, inject } from "inversify";

import {
  createContainer,
  container,
  inject as injectHelper,
  TYPES,
} from "@infrastructure/di";

// Test interfaces and implementations
interface ITestService {
  getValue(): string;
}

@injectable()
class TestService implements ITestService {
  getValue(): string {
    return "test value";
  }
}

interface IConfigurableService {
  getConfig(): Record<string, unknown>;
}

@injectable()
class ConfigurableService implements IConfigurableService {
  constructor(@inject(TYPES.ConfigService) private configService: any) {}

  getConfig(): Record<string, unknown> {
    return this.configService.getConfig();
  }
}

describe("DI Container", () => {
  let testContainer: Container;

  beforeEach(() => {
    testContainer = new Container();
  });

  afterEach(() => {
    testContainer.unbindAll();
  });

  describe("createContainer", () => {
    it("should create a container with all required services", () => {
      const container = createContainer();

      // Test core infrastructure services
      expect(container.isBound(TYPES.ConfigService)).toBe(true);
      expect(container.isBound(TYPES.LoggerService)).toBe(true);
      expect(container.isBound(TYPES.StorageService)).toBe(true);
      expect(container.isBound(TYPES.CacheService)).toBe(true);
      expect(container.isBound(TYPES.DatabaseService)).toBe(true);

      // Test database services
      expect(container.isBound(TYPES.DatabaseConfig)).toBe(true);

      // Test job system
      expect(container.isBound(TYPES.JobService)).toBe(true);
      expect(container.isBound(TYPES.JobStorage)).toBe(true);
      expect(container.isBound(TYPES.JobStorageConfig)).toBe(true);
      expect(container.isBound(TYPES.JobServiceConfig)).toBe(true);
    });

    it("should create singleton instances", () => {
      const container = createContainer();

      const service1 = container.get(TYPES.ConfigService);
      const service2 = container.get(TYPES.ConfigService);

      expect(service1).toBe(service2);
    });
  });

  describe("container singleton", () => {
    it("should maintain singleton instance across imports", () => {
      const container1 = container;
      const container2 = container;

      expect(container1).toBe(container2);
    });

    it("should have all required services bound", () => {
      expect(container.isBound(TYPES.ConfigService)).toBe(true);
      expect(container.isBound(TYPES.LoggerService)).toBe(true);
      expect(container.isBound(TYPES.DatabaseService)).toBe(true);
    });
  });

  describe("inject helper", () => {
    it("should inject dependencies using the helper function", () => {
      const service = injectHelper<ITestService>(TYPES.ConfigService);
      expect(service).toBeDefined();
    });

    it("should throw error for unbound service", () => {
      expect(() => {
        injectHelper<ITestService>(Symbol.for("UnboundService"));
      }).toThrow();
    });
  });

  describe("service registration", () => {
    it("should register and resolve a service", () => {
      testContainer.bind<ITestService>(TYPES.ConfigService).to(TestService);
      const service = testContainer.get<ITestService>(TYPES.ConfigService);
      expect(service.getValue()).toBe("test value");
    });

    it("should handle nested dependencies", () => {
      testContainer
        .bind<IConfigurableService>(TYPES.ConfigService)
        .to(ConfigurableService);
      const service = testContainer.get<IConfigurableService>(
        TYPES.ConfigService,
      );
      expect(service.getConfig()).toBeDefined();
    });

    it("should maintain singleton scope", () => {
      testContainer
        .bind<ITestService>(TYPES.ConfigService)
        .to(TestService)
        .inSingletonScope();
      const service1 = testContainer.get<ITestService>(TYPES.ConfigService);
      const service2 = testContainer.get<ITestService>(TYPES.ConfigService);
      expect(service1).toBe(service2);
    });

    it("should create new instances in transient scope", () => {
      testContainer
        .bind<ITestService>(TYPES.ConfigService)
        .to(TestService)
        .inTransientScope();
      const service1 = testContainer.get<ITestService>(TYPES.ConfigService);
      const service2 = testContainer.get<ITestService>(TYPES.ConfigService);
      expect(service1).not.toBe(service2);
    });
  });

  describe("error handling", () => {
    it("should throw error when resolving unbound service", () => {
      expect(() => {
        testContainer.get<ITestService>(Symbol.for("UnboundService"));
      }).toThrow();
    });

    it("should throw error when resolving service with missing dependencies", () => {
      testContainer
        .bind<IConfigurableService>(TYPES.ConfigService)
        .to(ConfigurableService);
      expect(() => {
        testContainer.get<IConfigurableService>(TYPES.ConfigService);
      }).toThrow();
    });
  });

  describe("container lifecycle", () => {
    it("should unbind all services", () => {
      testContainer.bind<ITestService>(TYPES.ConfigService).to(TestService);
      expect(testContainer.isBound(TYPES.ConfigService)).toBe(true);

      testContainer.unbindAll();
      expect(testContainer.isBound(TYPES.ConfigService)).toBe(false);
    });

    it("should handle container reset", () => {
      testContainer.bind<ITestService>(TYPES.ConfigService).to(TestService);
      const service1 = testContainer.get<ITestService>(TYPES.ConfigService);

      testContainer.unbindAll();
      testContainer.bind<ITestService>(TYPES.ConfigService).to(TestService);
      const service2 = testContainer.get<ITestService>(TYPES.ConfigService);

      expect(service1).not.toBe(service2);
    });
  });

  describe("service types", () => {
    it("should have unique symbols for all services", () => {
      const symbols = Object.values(TYPES);
      const uniqueSymbols = new Set(symbols);
      expect(symbols.length).toBe(uniqueSymbols.size);
    });

    it("should have descriptive service names", () => {
      expect(TYPES.ConfigService.toString()).toContain("ConfigService");
      expect(TYPES.LoggerService.toString()).toContain("LoggerService");
      expect(TYPES.DatabaseService.toString()).toContain("DatabaseService");
    });
  });
});
