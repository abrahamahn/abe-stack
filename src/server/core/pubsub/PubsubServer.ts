import { WebsocketPubsubServer } from "./WebsocketPubsubServer";

import type { Server } from "http";

// Turn on request logging.
// https://expressjs.com/en/guide/debugging.html
// process.env.DEBUG = "express:*"

export function PubsubServer(
  _environment: Record<string, never>,
  server: Server,
): WebsocketPubsubServer {
  return new WebsocketPubsubServer(server, function (_key) {
    // this.publish([{ key, value }])
  });
}
