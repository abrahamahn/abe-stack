import { FileJobStorage } from "@infrastructure/jobs";
import { ILoggerService } from "@infrastructure/logging";
import { IStorageService } from "@infrastructure/storage";

describe("FileJobStorage", () => {
  it("should be defined", () => {
    expect(FileJobStorage).toBeDefined();
  });

  it("should be instantiable", () => {
    // Mock dependencies
    const mockLogger = {} as ILoggerService;
    const mockStorage = {} as IStorageService;
    const config = { basePath: "/test" };

    // Create instance
    const storage = new FileJobStorage(mockLogger, mockStorage, config);
    expect(storage).toBeDefined();
  });
});
