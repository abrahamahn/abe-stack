import type { Server } from "http"

import { WebSocketServer } from "ws"

import { ClientPubsubMessage, ServerPubsubMessage } from "../../shared/PubSubTypes"

const debug = (...args: unknown[]) => console.log("pubsub:", ...args)

export type PubsubApi = {
	publish(items: { key: string; value: unknown }[]): Promise<void>
}

// Define a type for WebSocket to avoid type errors
type SafeWebSocket = {
	on(event: string, listener: (data?: unknown) => void): void;
	send(data: string): void;
};

// TODO: sticky sessions.
export class WebsocketPubsubServer implements PubsubApi {
	private wss: WebSocketServer
	private connections = new Map<SafeWebSocket, Set<string>>()

	constructor(server: Server, onSubscribe: (this: PubsubApi, key: string) => void) {
		this.wss = new WebSocketServer({ server })

		this.wss.on("connection", (connection) => {
			const safeConnection = connection as SafeWebSocket;
			const subscriptions = new Set<string>()
			this.connections.set(safeConnection, subscriptions)

			safeConnection.on("close", () => {
				this.connections.delete(safeConnection)
			})

			safeConnection.on("message", (data) => {
				// Convert data to string safely
				const dataString: string = Buffer.isBuffer(data) 
					? data.toString('utf-8') 
					: String(data);
				const message = JSON.parse(dataString) as ClientPubsubMessage

				debug("<", message.type, message.key)

				// TODO: validate incoming data.
				if (message.type === "subscribe") {
					subscriptions.add(message.key)
					onSubscribe.call(this, message.key)
					return
				}
				if (message.type === "unsubscribe") {
					subscriptions.delete(message.key)
					return
				}
			})
		})
	}

	async publish(items: { key: string; value: unknown }[]): Promise<void> {
		return Promise.resolve().then(() => {
			for (const { key, value } of items) {
				const message: ServerPubsubMessage = { type: "update", key, value }
				debug(">", message.type, message.key, message.value)
				const data = JSON.stringify(message)

				for (const [connection, subscriptions] of this.connections.entries()) {
					if (subscriptions.has(key)) {
						connection.send(data)
					}
				}
			}
		});
	}
}
