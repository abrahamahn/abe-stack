import { LoggerService } from "@/server/infrastructure/logging/LoggerService";

describe("Logger", () => {
  it("should be defined", () => {
    expect(LoggerService).toBeDefined();
  });
});
