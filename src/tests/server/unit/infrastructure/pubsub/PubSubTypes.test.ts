import { describe, it, expect } from "vitest";

import type {
  ClientPubsubMessage,
  ServerPubsubMessage,
  PubSubEvent,
  PubSubCallback,
  PubSubUnsubscribe,
} from "../../../../../server/infrastructure/pubsub/PubSubTypes";

describe("PubSubTypes", () => {
  describe("ClientPubsubMessage", () => {
    it("should allow subscribe message", () => {
      const message: ClientPubsubMessage = {
        type: "subscribe",
        key: "test-key",
      };
      expect(message).toBeDefined();
      expect(message.type).toBe("subscribe");
      expect(message.key).toBe("test-key");
    });

    it("should allow unsubscribe message", () => {
      const message: ClientPubsubMessage = {
        type: "unsubscribe",
        key: "test-key",
      };
      expect(message).toBeDefined();
      expect(message.type).toBe("unsubscribe");
      expect(message.key).toBe("test-key");
    });
  });

  describe("ServerPubsubMessage", () => {
    it("should allow update message with any value", () => {
      const messages: ServerPubsubMessage[] = [
        {
          type: "update",
          key: "test-key",
          value: "string value",
        },
        {
          type: "update",
          key: "test-key",
          value: 123,
        },
        {
          type: "update",
          key: "test-key",
          value: { nested: "object" },
        },
        {
          type: "update",
          key: "test-key",
          value: null,
        },
        {
          type: "update",
          key: "test-key",
          value: undefined,
        },
      ];

      messages.forEach((message) => {
        expect(message).toBeDefined();
        expect(message.type).toBe("update");
        expect(message.key).toBe("test-key");
        expect("value" in message).toBe(true);
      });
    });
  });

  describe("PubSubEvent", () => {
    it("should allow event with data", () => {
      const event: PubSubEvent = {
        type: "test-event",
        data: { some: "data" },
      };
      expect(event).toBeDefined();
      expect(event.type).toBe("test-event");
      expect(event.data).toBeDefined();
    });

    it("should allow event without data", () => {
      const event: PubSubEvent = {
        type: "test-event",
      };
      expect(event).toBeDefined();
      expect(event.type).toBe("test-event");
      expect(event.data).toBeUndefined();
    });
  });

  describe("PubSubCallback", () => {
    it("should allow synchronous callback", () => {
      const callback: PubSubCallback = (event: PubSubEvent) => {
        expect(event.type).toBe("test-event");
      };
      expect(typeof callback).toBe("function");
      callback({ type: "test-event" });
    });

    it("should allow asynchronous callback", () => {
      const callback: PubSubCallback = async (event: PubSubEvent) => {
        expect(event.type).toBe("test-event");
      };
      expect(typeof callback).toBe("function");
      callback({ type: "test-event" });
    });

    it("should allow callback that returns void", () => {
      const callback: PubSubCallback = (_event: PubSubEvent) => {
        // No return statement
      };
      expect(typeof callback).toBe("function");
      callback({ type: "test-event" });
    });
  });

  describe("PubSubUnsubscribe", () => {
    it("should allow unsubscribe function", () => {
      const unsubscribe: PubSubUnsubscribe = () => {
        // Cleanup logic
      };
      expect(typeof unsubscribe).toBe("function");
      unsubscribe();
    });
  });
});
