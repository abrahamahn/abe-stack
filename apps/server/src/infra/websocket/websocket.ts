import websocketPlugin from '@fastify/websocket';

import { verifyToken } from '../../modules/auth/utils/jwt';

import type { AppContext } from '../../shared';
import type { WebSocket as PubSubWebSocket } from '../pubsub/types';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';

/**
 * Register WebSocket support
 */
export async function registerWebSocket(server: FastifyInstance, ctx: AppContext): Promise<void> {
  // Register the plugin
  await server.register(websocketPlugin);

  // Register the websocket route
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.get('/ws', { websocket: true }, (connection: any, req) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    handleConnection(connection.socket as WebSocket, req, ctx);
  });
}

/**
 * Handle a new WebSocket connection
 */
function handleConnection(socket: WebSocket, req: FastifyRequest, ctx: AppContext): void {
  // 1. Authentication
  // WebSockets don't support custom headers in browsers, so we check:
  // - 'sec-websocket-protocol' header (standard workaround)
  // - 'token' query parameter
  // - Cookies (automatically sent)

  let token: string | undefined;

  // Check query param
  const query = req.query as { token?: string };
  if (query.token) {
    token = query.token;
  }

  // Check protocol header (subprotocol)
  // Client: new WebSocket(url, ['graphql', 'token']) -> Server sees 'graphql, token'
  // We expect just the token as a subprotocol or alongside others
  if (!token && req.headers['sec-websocket-protocol']) {
    const protocols = req.headers['sec-websocket-protocol'].split(',').map((p) => p.trim());
    // Assume the token is one of the protocols. We try to verify each.
    // This is a heuristic.
    token = protocols.find((p) => !['graphql', 'json'].includes(p));
  }

  // Check cookies
  if (!token && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    socket.close(1008, 'Authentication required');
    return;
  }

  try {
    const user = verifyToken(token, ctx.config.auth.jwt.secret);

    ctx.log.debug({ userId: user.userId }, 'WebSocket client connected');

    // 2. Setup handlers
    socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      // Forward to subscription manager
      // We assume text messages for now
      let message = '';
      if (Buffer.isBuffer(data)) {
        message = data.toString();
      } else if (Array.isArray(data)) {
        message = Buffer.concat(data).toString();
      } else {
        // ArrayBuffer
        message = Buffer.from(data).toString();
      }

      ctx.pubsub.handleMessage(socket as unknown as PubSubWebSocket, message);
    });

    socket.on('close', () => {
      ctx.log.debug({ userId: user.userId }, 'WebSocket client disconnected');
      ctx.pubsub.cleanup(socket as unknown as PubSubWebSocket);
    });

    socket.on('error', (err: Error) => {
      ctx.log.error({ err, userId: user.userId }, 'WebSocket error');
      ctx.pubsub.cleanup(socket as unknown as PubSubWebSocket);
    });
  } catch {
    socket.close(1008, 'Invalid token');
  }
}
