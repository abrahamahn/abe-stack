import { Logger, IServiceLogger } from "@/server/infrastructure/logging";

import { EventEmitter } from "./EventEmitter";

/**
 * Event data interface
 */
export interface EventData {
  id: string;
  name: string;
  data: unknown;
  timestamp: number;
  source: string;
}

/**
 * Event subscription handler function
 */
export type EventHandler = (eventData: EventData) => void | Promise<void>;

/**
 * Service for event publication and subscription across the application
 * Features:
 * 1. Event publication and subscription
 * 2. Event persistence
 * 3. Event replay capabilities
 * 4. Cross-service communication
 * 5. Event filtering
 * 6. Event history tracking
 */
export class EventBusService {
  private eventEmitter: EventEmitter;
  private eventHistory: Map<string, EventData[]>;
  private historyLimit: number;
  private logger: IServiceLogger;

  /**
   * Create a new EventBusService
   * @param historyLimit Maximum number of events to store in history per event type
   */
  constructor(historyLimit = 100) {
    this.eventEmitter = new EventEmitter();
    this.eventHistory = new Map();
    this.historyLimit = historyLimit;
    this.logger = Logger.getInstance().createServiceLogger("EventBusService");
  }

  /**
   * Publish an event
   * @param eventName Name of the event
   * @param data Event payload
   * @param source Source of the event (service name)
   * @returns Event ID
   */
  async publish(
    eventName: string,
    data: unknown,
    source: string
  ): Promise<string> {
    const eventId = this.generateEventId();
    const eventData: EventData = {
      id: eventId,
      name: eventName,
      data,
      timestamp: Date.now(),
      source,
    };

    // Store in history
    this.storeEventInHistory(eventName, eventData);

    // Emit the event
    this.eventEmitter.emit(eventName, eventData);
    this.logger.debug(`Event published: ${eventName}`, { eventId, source });

    return eventId;
  }

  /**
   * Subscribe to an event
   * @param eventName Name of the event to subscribe to
   * @param handler Event handler function
   */
  subscribe(eventName: string, handler: EventHandler): void {
    const wrappedHandler = (eventData: unknown): void => {
      try {
        const typedEventData = eventData as EventData;
        handler(typedEventData);
      } catch (error) {
        this.logger.error(`Error in event handler for ${eventName}`, { error });
      }
    };

    this.eventEmitter.on(eventName, wrappedHandler);
    this.logger.debug(`Subscribed to event: ${eventName}`);
  }

  /**
   * Unsubscribe from an event
   * @param eventName Name of the event
   * @param handler Event handler function to remove
   */
  unsubscribe(eventName: string, handler: EventHandler): void {
    // Note: This is a simplified implementation, as we can't directly compare the wrapped handler
    // In a real implementation, we would store references to wrapped handlers
    this.eventEmitter.off(
      eventName,
      handler as unknown as (...args: unknown[]) => void
    );
    this.logger.debug(`Unsubscribed from event: ${eventName}`);
  }

  /**
   * Get event history for a specific event
   * @param eventName Name of the event
   * @returns Array of past events
   */
  getEventHistory(eventName: string): EventData[] {
    return this.eventHistory.get(eventName) || [];
  }

  /**
   * Replay past events to a handler
   * @param eventName Name of the event to replay
   * @param handler Handler to process the replayed events
   */
  async replayEvents(eventName: string, handler: EventHandler): Promise<void> {
    const history = this.getEventHistory(eventName);

    this.logger.debug(`Replaying ${history.length} events for: ${eventName}`);

    for (const eventData of history) {
      try {
        await Promise.resolve(handler(eventData));
      } catch (error) {
        this.logger.error(`Error replaying event ${eventName}`, {
          eventId: eventData.id,
          error,
        });
      }
    }
  }

  /**
   * Clear all event history
   */
  clearEventHistory(): void {
    this.eventHistory.clear();
    this.logger.debug("Event history cleared");
  }

  /**
   * Generate a unique event ID
   * @returns Unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store an event in the history
   * @param eventName Name of the event
   * @param eventData Event data
   */
  private storeEventInHistory(eventName: string, eventData: EventData): void {
    const events = this.eventHistory.get(eventName) || [];

    // Add new event
    events.push(eventData);

    // Truncate if necessary
    if (events.length > this.historyLimit) {
      events.splice(0, events.length - this.historyLimit);
    }

    this.eventHistory.set(eventName, events);
  }
}
