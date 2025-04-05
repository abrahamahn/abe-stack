# 📡 PubSub and WebSocket System

## 📋 Purpose

The PubSub and WebSocket system provides a robust framework for real-time messaging and event-driven communication, offering:

- Real-time bi-directional communication channels
- Publish-subscribe messaging patterns
- Topic-based message distribution
- Client connection management
- Message authentication and authorization
- Scalable message delivery architecture

This module enables real-time features such as live updates, notifications, chat functionality, and collaborative features throughout the application.

## 🧩 Key Components

### 1️⃣ WebSocket Service

- **`WebSocketService`**: Core implementation of WebSocket server
- **`IWebSocketService`**: Interface defining the WebSocket service contract
- Handles client connections, message routing, and channel subscriptions

### 2️⃣ Type Definitions

- **`WebSocketTypes`**: Type definitions for WebSocket messages and events
- **`PubSubTypes`**: Type definitions for publish-subscribe patterns
- Provides type safety for message handling and event processing

### 3️⃣ Integration Interfaces

- **`IWebSocketService`**: Service contract for WebSocket functionality
- Defines methods for publishing, subscribing, and connection management

## 🛠️ Usage Instructions

### Setting Up the WebSocket Server

```typescript
import { WebSocketService } from "@/server/infrastructure/pubsub";
import { ServerManager } from "@/server/infrastructure/server";
import { LoggerService } from "@/server/infrastructure/logging";

// Initialize dependencies
const logger = new LoggerService();
const serverManager = new ServerManager();

// Create WebSocket service
const websocketService = new WebSocketService({
  logger,
  path: "/ws",
  pingInterval: 30000, // 30 seconds
  authenticator: async (token) => {
    // Verify authentication token
    const user = await authService.verifyToken(token);
    return user ? { userId: user.id, roles: user.roles } : null;
  },
});

// Register with HTTP server
serverManager.registerMiddleware(websocketService.middleware);

// Start server
await serverManager.start();
console.log("WebSocket server started on path /ws");
```

### Publishing Messages

```typescript
import { inject, injectable } from "inversify";
import { IWebSocketService } from "@/server/infrastructure/pubsub";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class NotificationService {
  constructor(
    @inject(TYPES.WebSocketService) private wsService: IWebSocketService,
  ) {}

  // Send notification to a specific user
  async sendUserNotification(
    userId: string,
    notification: Notification,
  ): Promise<void> {
    await this.wsService.publish(`user.${userId}.notifications`, {
      type: "notification",
      data: notification,
    });
  }

  // Broadcast notification to all users
  async broadcastSystemNotification(
    notification: SystemNotification,
  ): Promise<void> {
    await this.wsService.publish("system.notifications", {
      type: "system_notification",
      data: notification,
    });
  }

  // Send message to clients in a room
  async sendRoomMessage(roomId: string, message: ChatMessage): Promise<void> {
    await this.wsService.publish(`room.${roomId}.messages`, {
      type: "chat_message",
      data: message,
    });
  }
}
```

### Client-Side Integration

```typescript
// Client-side code (browser)
const connectWebSocket = (authToken) => {
  // Create WebSocket connection
  const socket = new WebSocket(`wss://api.example.com/ws?token=${authToken}`);

  // Set up event handlers
  socket.onopen = () => {
    console.log("WebSocket connection established");

    // Subscribe to topics
    socket.send(
      JSON.stringify({
        type: "subscribe",
        topics: [
          `user.${userId}.notifications`,
          "system.notifications",
          `room.${roomId}.messages`,
        ],
      }),
    );
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case "notification":
        displayNotification(message.data);
        break;
      case "system_notification":
        displaySystemAlert(message.data);
        break;
      case "chat_message":
        addMessageToChat(message.data);
        break;
      default:
        console.log("Unknown message type:", message.type);
    }
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    // Implement reconnection logic
    setTimeout(() => connectWebSocket(authToken), 5000);
  };

  return socket;
};
```

## 🏗️ Architecture Decisions

### WebSocket Protocol

- **Decision**: Use WebSocket protocol for real-time communications
- **Rationale**: Provides full-duplex communication with low overhead
- **Benefit**: Efficient real-time updates without polling

### Pub/Sub Pattern

- **Decision**: Implement publish-subscribe messaging pattern
- **Rationale**: Decouples message producers from consumers
- **Implementation**: Topic-based messaging with subscription management

### Authentication Integration

- **Decision**: Integrate with application authentication system
- **Rationale**: Ensures secure access to WebSocket channels
- **Implementation**: Token-based authentication with middleware

### Scalability Considerations

- **Decision**: Design for horizontal scaling
- **Rationale**: Enables growth with increasing user load
- **Implementation**: Stateless design with external message broker support

## ⚙️ Setup and Configuration Notes

### Basic Configuration

Configure the WebSocket service:

```typescript
import { WebSocketService } from "@/server/infrastructure/pubsub";

const webSocketService = new WebSocketService({
  // Path for WebSocket connections
  path: "/ws",

  // Connection settings
  maxConnections: 10000,
  pingInterval: 30000, // 30 seconds
  pingTimeout: 10000, // 10 seconds

  // Security settings
  allowOrigins: ["https://example.com"],
  requireAuthentication: true,

  // Performance settings
  maxPayloadSize: 1024 * 1024, // 1MB
  perMessageDeflate: true, // Enable compression

  // Logging
  logLevel: process.env.NODE_ENV === "production" ? "info" : "debug",
});
```

### Authentication Setup

Integrating with authentication:

```typescript
import { WebSocketService } from "@/server/infrastructure/pubsub";
import { JwtService } from "@/server/infrastructure/security";

const jwtService = new JwtService();

const webSocketService = new WebSocketService({
  // Other config...

  // Authentication handler
  authenticator: async (token, request) => {
    try {
      // Verify JWT token
      const payload = await jwtService.verify(token);

      // Return user context for the connection
      return {
        userId: payload.sub,
        roles: payload.roles,
        metadata: {
          clientIp: request.connection.remoteAddress,
          userAgent: request.headers["user-agent"],
        },
      };
    } catch (error) {
      // Authentication failed
      return null;
    }
  },

  // Authorization handler for subscriptions
  authorizeSubscribe: async (topic, connection) => {
    const { userId, roles } = connection.context;

    // User-specific topics
    if (topic.startsWith(`user.${userId}.`)) {
      return true;
    }

    // Room topics - check if user is member
    if (topic.startsWith("room.")) {
      const roomId = topic.split(".")[1];
      return await roomService.isMember(roomId, userId);
    }

    // Admin topics
    if (topic.startsWith("admin.") && roles.includes("admin")) {
      return true;
    }

    // Public topics
    if (topic.startsWith("public.")) {
      return true;
    }

    return false;
  },
});
```

### Scaling with Redis

For multi-server deployments:

```typescript
import { WebSocketService } from "@/server/infrastructure/pubsub";
import { createClient } from "redis";

// Create Redis clients
const redisSubscriber = createClient({ url: process.env.REDIS_URL });
const redisPublisher = redisSubscriber.duplicate();

// Connect to Redis
await redisSubscriber.connect();
await redisPublisher.connect();

// Create WebSocket service with Redis adapter
const webSocketService = new WebSocketService({
  // Other config...

  // Redis adapter for scaling across multiple servers
  adapter: {
    type: "redis",
    options: {
      publisher: redisPublisher,
      subscriber: redisSubscriber,
      channel: "websocket_messages",
    },
  },
});
```

### Monitoring and Metrics

Adding monitoring capabilities:

```typescript
import { WebSocketService } from "@/server/infrastructure/pubsub";
import { MetricsService } from "@/server/infrastructure/metrics";

const metricsService = new MetricsService();

const webSocketService = new WebSocketService({
  // Other config...

  // Metrics and monitoring
  metrics: {
    onConnection: (connection) => {
      metricsService.increment("websocket.connections.active");
      metricsService.histogram("websocket.connections.by_user", 1, {
        userId: connection.context.userId,
      });
    },
    onDisconnect: (connection) => {
      metricsService.decrement("websocket.connections.active");
    },
    onMessage: (message, connection) => {
      metricsService.increment("websocket.messages.received");
      metricsService.histogram("websocket.message.size", message.length);
    },
    onPublish: (topic, message) => {
      metricsService.increment("websocket.messages.published", {
        topic,
      });
    },
  },
});
```
