# 🧪 PubSub Unit Tests

## 📋 Overview

This directory contains unit tests for the publish-subscribe system components. The tests validate the functionality of WebSocket-based real-time communication, message delivery, and subscription management.

## 🧩 Test Files

| File                                                     | Description                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| [WebSocketService.test.ts](./WebSocketService.test.ts)   | Tests the WebSocket server implementation for real-time messaging |
| [IWebSocketService.test.ts](./IWebSocketService.test.ts) | Tests the WebSocket service interface contract                    |
| [PubSubTypes.test.ts](./PubSubTypes.test.ts)             | Tests publish-subscribe type definitions and validation           |
| [WebSocketTypes.test.ts](./WebSocketTypes.test.ts)       | Tests WebSocket-specific type definitions                         |

## 🔍 Key Test Scenarios

### Connection Management

- WebSocket connection establishment
- Connection authentication
- Connection state tracking
- Disconnection handling
- Reconnection logic

### Message Publishing

- Topic-based message publication
- Message format validation
- Message delivery guarantees
- Broadcast messaging
- Targeted messaging

### Subscription Management

- Topic subscription
- Topic unsubscription
- Subscription filtering
- Pattern-based subscriptions
- Subscription persistence

### Error Handling

- Connection error recovery
- Message delivery failure
- Invalid message format
- Authorization failure
- Resource exhaustion

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock WebSocket connections
- Mock message handlers
- Connection pool simulation
- Authentication providers

### Common Patterns

```typescript
// Example pattern for testing subscription and message delivery
it("should deliver messages to subscribed clients", async () => {
  // Arrange
  const webSocketService = new WebSocketService();
  const mockClient1 = createMockWebSocketClient("client1");
  const mockClient2 = createMockWebSocketClient("client2");

  // Connect clients
  await webSocketService.handleConnection(mockClient1);
  await webSocketService.handleConnection(mockClient2);

  // Subscribe to topics
  await webSocketService.subscribe(mockClient1, "topic1");
  await webSocketService.subscribe(mockClient2, "topic2");

  // Act
  await webSocketService.publish("topic1", { message: "Hello topic1" });
  await webSocketService.publish("topic2", { message: "Hello topic2" });
  await webSocketService.publish("topic3", { message: "Hello topic3" });

  // Assert
  expect(mockClient1.send).toHaveBeenCalledWith(
    expect.stringContaining("Hello topic1"),
  );
  expect(mockClient1.send).not.toHaveBeenCalledWith(
    expect.stringContaining("Hello topic2"),
  );
  expect(mockClient1.send).not.toHaveBeenCalledWith(
    expect.stringContaining("Hello topic3"),
  );

  expect(mockClient2.send).toHaveBeenCalledWith(
    expect.stringContaining("Hello topic2"),
  );
  expect(mockClient2.send).not.toHaveBeenCalledWith(
    expect.stringContaining("Hello topic1"),
  );
  expect(mockClient2.send).not.toHaveBeenCalledWith(
    expect.stringContaining("Hello topic3"),
  );
});
```

## 📚 Advanced Testing Techniques

### Scalability Testing

- Large subscriber sets
- High message throughput
- Connection pool management

### Security Testing

- Message authorization
- Connection authentication
- Input validation
- Rate limiting

### Protocol Testing

- WebSocket protocol conformance
- Handshake validation
- Frame format validation
- Subprotocol negotiation

## 🔗 Related Components

- [Server](../server/README.md) - For HTTP server integration
- [Security](../security/README.md) - For WebSocket authentication
- [Lifecycle](../lifecycle/README.md) - For service lifecycle hooks
