import { container } from "@/server/infrastructure/di";
import { Logger } from "@/server/infrastructure/logging";
import { IWebSocketService } from "@/server/infrastructure/pubsub/IWebSocketService";
import { WebSocketService } from "@/server/infrastructure/pubsub/WebSocketService";

import { EventBusService } from "./communication/EventBusService";
import { RealTimeService } from "./communication/RealTimeService";

// Type definitions for repository return types
interface Notification {
  id: string;
  userId: string;
  type: string;
  content: string;
  read: boolean;
  created: Date;
  metadata?: Record<string, unknown>;
}

interface ChatRoom {
  id: string;
  name: string;
  creatorId: string;
  participantIds: string[];
  createdAt: Date;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

interface UserConnection {
  id?: string;
  userId: string;
  targetUserId: string;
  type?: string;
  status?: string;
  createdAt?: Date;
}

// Repository interfaces
interface NotificationRepository {
  create(data: Record<string, unknown>): Promise<Notification>;
  markAsRead(userId: string, notificationIds: string[]): Promise<void>;
  findByUserId(
    userId: string,
    limit: number,
    offset: number,
    unreadOnly?: boolean
  ): Promise<{ notifications: Notification[]; total: number }>;
}

interface UserRepository {
  findByIds(userIds: string[]): Promise<Record<string, unknown>[]>;
  updatePresence(userId: string, status: string): Promise<void>;
}

interface ChatRoomRepository {
  create(data: Record<string, unknown>): Promise<ChatRoom>;
  findById(roomId: string): Promise<ChatRoom | null>;
}

interface ChatMessageRepository {
  create(data: Record<string, unknown>): Promise<ChatMessage>;
  findByRoomId(
    roomId: string,
    limit: number,
    before?: Date
  ): Promise<ChatMessage[]>;
}

interface ConnectionRepository {
  findUserConnections(userId: string): Promise<UserConnection[]>;
}

/**
 * Service container that manages service registration and resolution
 * This uses the infrastructure dependency injection container
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private container: typeof container;

  private constructor() {
    this.container = container;
    this.registerServices();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Register a service with the container
   * @param identifier Service identifier
   * @param service Service implementation
   */
  public register<T>(identifier: string, service: T): void {
    if (this.container.isBound(identifier)) {
      throw new Error(`Service ${identifier} is already registered`);
    }
    this.container.bind<T>(identifier).toConstantValue(service);
  }

  /**
   * Resolve a service from the container
   * @param identifier Service identifier
   * @returns Resolved service
   */
  public resolve<T>(identifier: string): T {
    if (!this.container.isBound(identifier)) {
      throw new Error(`Service ${identifier} is not registered`);
    }
    return this.container.get<T>(identifier);
  }

  /**
   * Check if a service is registered
   * @param identifier Service identifier
   * @returns True if registered, false otherwise
   */
  public has(identifier: string): boolean {
    return this.container.isBound(identifier);
  }

  /**
   * Register core services with the container
   */
  private registerServices(): void {
    // Register internal services that don't have dedicated containers
    this.register("EventBusService", new EventBusService());

    // Register WebSocketService
    const loggerService = Logger.getInstance();
    const wsService = new WebSocketService(loggerService);
    this.register<IWebSocketService>("WebSocketService", wsService);

    // You can register more core services here as needed
    // Examples:
    // this.register("CacheService", new CacheService());
    // this.register("MetricsService", new MetricsService());
    // this.register("NotificationService", new NotificationService());
  }

  /**
   * Create and register the real-time service
   * This is separated because it requires repository dependencies
   * @param notificationRepository Notification repository
   * @param userRepository User repository
   * @param chatRoomRepository Chat room repository
   * @param chatMessageRepository Chat message repository
   * @param connectionRepository Connection repository
   */
  public registerRealTimeService(
    notificationRepository: NotificationRepository,
    userRepository: UserRepository,
    chatRoomRepository: ChatRoomRepository,
    chatMessageRepository: ChatMessageRepository,
    connectionRepository: ConnectionRepository
  ): RealTimeService {
    const wsService = this.resolve<IWebSocketService>("WebSocketService");
    const realTimeService = new RealTimeService(
      wsService,
      notificationRepository,
      userRepository,
      chatRoomRepository,
      chatMessageRepository,
      connectionRepository
    );
    this.register("RealTimeService", realTimeService);
    return realTimeService;
  }
}
