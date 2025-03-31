import { Transform } from "stream";

import { StreamProcessor } from "@infrastructure/processor";

describe("StreamProcessor", () => {
  it("should be defined", () => {
    expect(StreamProcessor).toBeDefined();
  });

  describe("createThrottleTransform", () => {
    it("should create a throttle transform stream", () => {
      const bytesPerSecond = 1024;

      // Create throttle transform
      const throttleTransform =
        StreamProcessor.createThrottleTransform(bytesPerSecond);

      // Verify it's a Transform stream
      expect(throttleTransform).toBeInstanceOf(Transform);
    });
  });
});
