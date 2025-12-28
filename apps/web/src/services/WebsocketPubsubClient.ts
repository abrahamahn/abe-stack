import { ClientPubsubMessage, ServerPubsubMessage } from '@infrastructure/pubsub';

import { sleep } from '@/server/infrastructure/lifecycle/sleep';

import { ClientConfig } from './ClientConfig';
import { SecondMs } from '../../server/infrastructure/utils/dateHelpers';

// Define a type for pubsub values
type PubSubValue = unknown;

const debug = (...args: unknown[]) => console.log('pubsub:', ...args);

export class WebsocketPubsubClient {
  private ws!: WebSocket;
  private reconnectAttempt = 1;
  private subscriptions: Map<string, Set<(value: PubSubValue) => void>> = new Map();

  constructor(
    private args: {
      config: ClientConfig;
      onChange: (key: string, value: PubSubValue) => void;
      onStart: () => void;
    },
  ) {
    this.connect();

    window.addEventListener('online', () => {
      this.reconnectAttempt = 1;
      this.connect();
    });
  }

  private connect() {
    debug('connecting...');
    this.ws = new WebSocket(`ws://${this.args.config.host}`);

    this.ws.onopen = () => {
      debug('connected!');
      this.reconnectAttempt = 1;
      this.args.onStart();

      // Resubscribe to all previous subscriptions
      for (const key of this.subscriptions.keys()) {
        this.send({ type: 'subscribe', key });
      }
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data as string) as ServerPubsubMessage;
      debug('<', message.type, message.key, message.value);

      // Call the global onChange handler
      this.args.onChange(message.key, message.value);

      // Call individual subscription callbacks
      const callbacks = this.subscriptions.get(message.key);
      if (callbacks) {
        for (const callback of callbacks) {
          callback(message.value);
        }
      }
    };

    this.ws.onerror = (error) => {
      debug('error', error);
    };

    this.ws.onclose = () => {
      debug('closed');
      void this.attemptReconnect();
    };
  }

  private async attemptReconnect() {
    if (!navigator.onLine) return;

    await sleep(2 ** this.reconnectAttempt * SecondMs);
    this.reconnectAttempt += 1;
    this.connect();
  }

  private send(message: ClientPubsubMessage) {
    if (this.ws.readyState === WebSocket.OPEN) {
      debug('>', message.type, message.key);
      this.ws.send(JSON.stringify(message));
    }
  }

  subscribe(key: string, callback?: (value: PubSubValue) => void) {
    // Add to subscriptions map
    if (callback) {
      if (!this.subscriptions.has(key)) {
        this.subscriptions.set(key, new Set());
      }
      this.subscriptions.get(key)?.add(callback);
    }

    // Send subscribe message
    this.send({ type: 'subscribe', key });

    // Return unsubscribe function
    return () => this.unsubscribe(key, callback);
  }

  unsubscribe(key: string, callback?: (value: PubSubValue) => void) {
    // Remove from subscriptions map
    if (callback && this.subscriptions.has(key)) {
      this.subscriptions.get(key)?.delete(callback);
      if ((this.subscriptions.get(key)?.size ?? 0) === 0) {
        this.subscriptions.delete(key);
        // Only send unsubscribe if no more callbacks for this key
        this.send({ type: 'unsubscribe', key });
      }
    } else if (!callback) {
      // If no callback provided, remove all subscriptions for this key
      this.subscriptions.delete(key);
      this.send({ type: 'unsubscribe', key });
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
