import { describe, it, expect } from "vitest";

import type { WebSocketMessage } from "@/server/infrastructure/pubsub/WebSocketTypes";

describe("WebSocketTypes", () => {
  describe("WebSocketMessage", () => {
    it("should allow basic message with required type", () => {
      const message: WebSocketMessage = {
        type: "test",
      };
      expect(message).toBeDefined();
      expect(message.type).toBe("test");
    });

    it("should allow message with all optional fields", () => {
      const message: WebSocketMessage = {
        type: "test",
        eventType: "event",
        channel: "channel1",
        data: { content: "test" },
        messageId: "msg-123",
        error: "error message",
      };
      expect(message).toBeDefined();
      expect(message.type).toBe("test");
      expect(message.eventType).toBe("event");
      expect(message.channel).toBe("channel1");
      expect(message.data).toEqual({ content: "test" });
      expect(message.messageId).toBe("msg-123");
      expect(message.error).toBe("error message");
    });

    it("should allow message with different data types", () => {
      const messages: WebSocketMessage[] = [
        { type: "test", data: "string" },
        { type: "test", data: 123 },
        { type: "test", data: true },
        { type: "test", data: null },
        { type: "test", data: undefined },
        { type: "test", data: { complex: "object" } },
        { type: "test", data: ["array", "of", "items"] },
      ];

      messages.forEach((message) => {
        expect(message).toBeDefined();
        expect(message.type).toBe("test");
      });
    });

    it("should allow message with different event types", () => {
      const messages: WebSocketMessage[] = [
        { type: "test", eventType: "auth" },
        { type: "test", eventType: "subscribe" },
        { type: "test", eventType: "message" },
        { type: "test", eventType: "system" },
      ];

      messages.forEach((message) => {
        expect(message).toBeDefined();
        expect(message.type).toBe("test");
        expect(message.eventType).toBeDefined();
      });
    });

    it("should allow message with different channel names", () => {
      const messages: WebSocketMessage[] = [
        { type: "test", channel: "general" },
        { type: "test", channel: "private-123" },
        { type: "test", channel: "presence:user-123" },
        { type: "test", channel: "system" },
      ];

      messages.forEach((message) => {
        expect(message).toBeDefined();
        expect(message.type).toBe("test");
        expect(message.channel).toBeDefined();
      });
    });

    it("should allow message with messageId for tracking", () => {
      const message: WebSocketMessage = {
        type: "test",
        messageId: "msg-" + Date.now(),
      };
      expect(message).toBeDefined();
      expect(message.type).toBe("test");
      expect(message.messageId).toBeDefined();
    });

    it("should allow message with error information", () => {
      const message: WebSocketMessage = {
        type: "error",
        error: "Invalid message format",
      };
      expect(message).toBeDefined();
      expect(message.type).toBe("error");
      expect(message.error).toBe("Invalid message format");
    });
  });
});
