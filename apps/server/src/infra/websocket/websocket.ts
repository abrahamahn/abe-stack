// apps/server/src/infra/websocket/websocket.ts
/**
 * WebSocket Support
 *
 * Manual WebSocket handling using ws directly. Replaces @fastify/websocket.
 */

import { parseCookies } from '@abe-stack/core/http';
import { validateCsrfToken } from '@http';
import { verifyToken } from '@modules/auth/utils/jwt';
import { users } from '@schema/users';
import { eq } from 'drizzle-orm';
import { WebSocketServer, type WebSocket } from 'ws';

import type { AppContext } from '@shared';
import type { FastifyInstance } from 'fastify';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

// ============================================================================
// Database Query Builders
// ============================================================================

/**
 * Type-safe mapping of allowed subscription tables to their query builders.
 */
function getTableQueryBuilder(
  db: AppContext['db'],
  table: string,
): {
  findFirst: (options: {
    where: (t: typeof users, ops: { eq: typeof eq }) => ReturnType<typeof eq>;
    columns: { version: boolean };
  }) => Promise<{ version: number } | undefined>;
} | null {
  switch (table) {
    case 'users':
      return {
        findFirst: (options: {
          where: (t: typeof users, ops: { eq: typeof eq }) => ReturnType<typeof eq>;
          columns: { version: boolean };
        }): Promise<{ version: number } | undefined> => {
          return db.query.users.findFirst({
            where: options.where(users, { eq }),
            columns: { version: true },
          });
        },
      };
    default:
      // For other tables that might be added later, return null for now
      return null;
  }
}

// ============================================================================
// WebSocket Adapter
// ============================================================================

/**
 * Minimal WebSocket interface for pub/sub operations.
 * This matches the interface expected by SubscriptionManager.
 */
interface PubSubWebSocket {
  readyState: number;
  send(data: string): void;
}

/**
 * Type guard to verify a WebSocket has the required pub/sub interface.
 * The 'ws' library's WebSocket always satisfies this interface.
 */
function asPubSubWebSocket(socket: WebSocket): PubSubWebSocket {
  // WebSocket from 'ws' always has readyState and send(),
  // so this is a safe structural cast (not `as unknown as`)
  return socket;
}

// ============================================================================
// Connection Tracking
// ============================================================================

export interface WebSocketStats {
  activeConnections: number;
  pluginRegistered: boolean;
}

let activeConnections = 0;
let pluginRegistered = false;

/**
 * Get WebSocket statistics for health checks
 */
export function getWebSocketStats(): WebSocketStats {
  return {
    activeConnections,
    pluginRegistered,
  };
}

// ============================================================================
// Cookie Parsing (for WebSocket auth)
// ============================================================================

// ============================================================================
// WebSocket Registration
// ============================================================================

/**
 * Reject WebSocket upgrade with HTTP error response
 */
function rejectUpgrade(socket: Duplex, statusCode: number, message: string): void {
  const response = [
    `HTTP/1.1 ${String(statusCode)} ${message}`,
    'Content-Type: text/plain',
    'Connection: close',
    '',
    message,
  ].join('\r\n');
  socket.write(response);
  socket.destroy();
}

/**
 * Register WebSocket support
 */
export function registerWebSocket(server: FastifyInstance, ctx: AppContext): void {
  // Create WebSocket server without HTTP server (we'll handle upgrade manually)
  const wss = new WebSocketServer({ noServer: true });
  pluginRegistered = true;

  // Determine CSRF encryption setting (matches server.ts configuration)
  const isProd = ctx.config.env === 'production';

  // Handle upgrade requests
  server.server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    // Only handle /ws path
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    // =========================================================================
    // CSRF Validation
    // =========================================================================
    // WebSocket upgrades must include a valid CSRF token to prevent cross-site
    // WebSocket hijacking attacks. The token can be provided via:
    // 1. Query parameter: ?csrf=<token>
    // 2. Sec-WebSocket-Protocol header: new WebSocket(url, ['csrf.<token>', ...])
    //
    // The cookie is automatically sent with the upgrade request.

    // Extract CSRF token from cookie
    const rawCookies: unknown = parseCookies(request.headers.cookie);
    const cookies = isStringRecord(rawCookies) ? rawCookies : {};
    const csrfCookie = cookies._csrf;

    // Extract CSRF token from request (query param or subprotocol)
    let csrfToken: string | undefined;

    // Check query parameter first
    csrfToken = url.searchParams.get('csrf') ?? undefined;

    // Check Sec-WebSocket-Protocol header (format: csrf.<token>)
    if (!csrfToken && request.headers['sec-websocket-protocol']) {
      const protocols = request.headers['sec-websocket-protocol'].split(',').map((p) => p.trim());
      const csrfProtocol = protocols.find((p) => p.startsWith('csrf.'));
      if (csrfProtocol) {
        csrfToken = csrfProtocol.slice(5); // Remove 'csrf.' prefix
      }
    }

    // Validate CSRF token
    const csrfValid = validateCsrfToken(csrfCookie, csrfToken, {
      secret: ctx.config.auth.cookie.secret,
      encrypted: isProd,
      signed: true,
    });

    if (!csrfValid) {
      ctx.log.warn('WebSocket upgrade rejected: invalid CSRF token');
      rejectUpgrade(socket, 403, 'Forbidden: Invalid CSRF token');
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      handleConnection(ws, request, ctx);
    });
  });

  ctx.log.info('WebSocket support registered on /ws');
}

/**
 * Handle a new WebSocket connection
 */
function handleConnection(socket: WebSocket, req: IncomingMessage, ctx: AppContext): void {
  // 1. Authentication
  // WebSockets don't support custom headers in browsers, so we check:
  // - 'sec-websocket-protocol' header (standard workaround for JWT)
  // - Cookies (HTTP-only cookies are automatically sent)
  //
  // NOTE: Query parameter tokens are NOT supported due to security risks:
  // - Tokens in URLs can leak via browser history, referrer headers, and server logs

  let token: string | undefined;

  // Check protocol header (subprotocol) - primary method for browsers
  // Client connects with: new WebSocket(url, ['Bearer', tokenValue])
  if (req.headers['sec-websocket-protocol']) {
    const protocols = req.headers['sec-websocket-protocol'].split(',').map((p) => p.trim());
    // Find token (skip known protocol names)
    token = protocols.find((p) => !['graphql', 'json', 'Bearer'].includes(p));
  }

  // Check cookies (accessToken cookie for seamless auth)
  if (!token) {
    const rawCookies: unknown = parseCookies(req.headers.cookie);
    const cookies = isStringRecord(rawCookies) ? rawCookies : {};
    const accessToken = cookies.accessToken;
    if (typeof accessToken === 'string') {
      token = accessToken;
    }
  }

  if (!token) {
    socket.close(1008, 'Authentication required');
    return;
  }

  try {
    const user = verifyToken(token, ctx.config.auth.jwt.secret);

    // Track connection
    activeConnections++;
    ctx.log.debug({ userId: user.userId, activeConnections }, 'WebSocket client connected');

    // 2. Setup handlers
    const pubsub = ctx.pubsub;

    socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      // Forward to subscription manager
      let message = '';
      if (Buffer.isBuffer(data)) {
        message = data.toString();
      } else if (Array.isArray(data)) {
        message = Buffer.concat(data).toString();
      } else {
        message = Buffer.from(data).toString();
      }

      pubsub.handleMessage(asPubSubWebSocket(socket), message, (key: string) => {
        void sendInitialData(ctx, socket, key);
      });
    });

    socket.on('close', () => {
      activeConnections--;
      ctx.log.debug({ userId: user.userId, activeConnections }, 'WebSocket client disconnected');
      pubsub.cleanup(asPubSubWebSocket(socket));
    });

    socket.on('error', (err: Error) => {
      activeConnections--;
      ctx.log.error({ err, userId: user.userId, activeConnections }, 'WebSocket error');
      pubsub.cleanup(asPubSubWebSocket(socket));
    });
  } catch (err) {
    ctx.log.warn({ err }, 'WebSocket token verification failed');
    socket.close(1008, 'Invalid token');
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
}

// ============================================================================
// Table Whitelist for WebSocket Subscriptions
// ============================================================================

/**
 * Whitelist of allowed table names for WebSocket subscriptions.
 * Only tables in this set can be queried via subscription keys.
 * This prevents SQL injection and unauthorized data access.
 */
const ALLOWED_SUBSCRIPTION_TABLES = new Set([
  'users',
  'sessions',
  'posts',
  'comments',
  'notifications',
  // Add more tables as needed for real-time subscriptions
]);

/**
 * Validate subscription key format and table name.
 * Key must be: record:{table}:{id}
 * - table: must be in whitelist, alphanumeric and underscores only
 * - id: must be alphanumeric, hyphens, and underscores only (UUID-safe)
 */
function isValidSubscriptionKey(key: string): { valid: boolean; table?: string; id?: string } {
  const parts = key.split(':');
  if (parts.length !== 3 || parts[0] !== 'record') {
    return { valid: false };
  }

  const [, table, id] = parts;
  if (!table || !id) {
    return { valid: false };
  }

  // Validate table name format (alphanumeric and underscores)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    return { valid: false };
  }

  // Check table is in whitelist
  if (!ALLOWED_SUBSCRIPTION_TABLES.has(table)) {
    return { valid: false };
  }

  // Validate ID format (alphanumeric, hyphens, underscores - UUID safe)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return { valid: false };
  }

  return { valid: true, table, id };
}

async function sendInitialData(ctx: AppContext, socket: WebSocket, key: string): Promise<void> {
  // Validate subscription key format and table whitelist
  const validation = isValidSubscriptionKey(key);
  if (!validation.valid || !validation.table || !validation.id) {
    ctx.log.warn({ key }, 'Invalid subscription key format or non-whitelisted table');
    return;
  }

  const { table, id } = validation;

  try {
    const queryBuilder = getTableQueryBuilder(ctx.db, table);
    if (!queryBuilder) return;

    const record = await queryBuilder.findFirst({
      where: (t, { eq }) => eq(t.id, id),
      columns: { version: true },
    });

    if (record) {
      socket.send(JSON.stringify({ type: 'update', key, version: record.version }));
    }
  } catch (err) {
    ctx.log.warn({ err, key }, 'Failed to fetch initial data for subscription');
  }
}
