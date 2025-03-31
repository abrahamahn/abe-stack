import { IStorageProvider } from "@infrastructure/storage";

describe("IStorageProvider", () => {
  it("should define the interface methods", () => {
    // This test just verifies we can define the interface
    const mockMethods = {
      initialize: jest.fn(),
      shutdown: jest.fn(),
      updateBaseUrl: jest.fn(),
      createDirectory: jest.fn(),
      saveFile: jest.fn(),
      getFile: jest.fn(),
      getFileStream: jest.fn(),
      getFileMetadata: jest.fn(),
      deleteFile: jest.fn(),
      fileExists: jest.fn(),
      listFiles: jest.fn(),
      copyFile: jest.fn(),
      moveFile: jest.fn(),
      getFileUrl: jest.fn(),
    };

    // This is just a type check to ensure the mock implements the interface
    const provider: IStorageProvider = mockMethods;

    // Simple assertion that the interface exists
    expect(provider).toBeDefined();
  });
});
