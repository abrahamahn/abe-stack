import type { Server } from "http"

import { WebsocketPubsubServer } from "./services/WebsocketPubsubServer"

// Turn on request logging.
// https://expressjs.com/en/guide/debugging.html
// process.env.DEBUG = "express:*"


export function PubsubServer(_environment: Record<string, never>, server: Server) {
	return new WebsocketPubsubServer(server, function (_key) {
		// this.publish([{ key, value }])
	})
}
