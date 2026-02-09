// src/server/websocket/src/lifecycle.ts
/**
 * WebSocket Lifecycle Management
 *
 * Handles WebSocket connection setup, authentication, CSRF validation,
 * and message routing. Uses the ws library directly with Fastify's
 * HTTP server for upgrade handling.
 *
 * @module websocket/lifecycle
 */

import { eq, select, USERS_TABLE } from '@abe-stack/db';
import { validateCsrfToken } from '@abe-stack/server-engine';
import { parseCookies } from '@abe-stack/shared';
import { WebSocketServer } from 'ws';

import { decrementConnections, incrementConnections, markPluginRegistered } from './stats';

import type { PubSubWebSocket, SubscriptionKey } from './types';
import type { DbClient } from '@abe-stack/db';
import type { Logger, SubscriptionManager } from '@abe-stack/shared';
import type { FastifyInstance } from 'fastify';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { WebSocket } from 'ws';

/**
 * WebSocket module dependencies.
 * structurally compatible with AppContext but decoupled from specific modules.
 */
export interface WebSocketDeps {
  readonly db: DbClient;
  readonly pubsub: SubscriptionManager;
  readonly log: Logger;
  readonly config: {
    readonly env: string;
    readonly auth: {
      readonly cookie: {
        readonly secret: string;
      };
      readonly jwt: {
        readonly secret: string;
      };
    };
  };
}

// ============================================================================
// Token Verification Types
// ============================================================================

/**
 * Token verification function type.
 * Injected by the server to avoid coupling to a specific auth implementation.
 *
 * @param token - JWT token string to verify
 * @param secret - JWT secret for verification
 * @returns Decoded token payload with userId
 */
export type TokenVerifier = (token: string, secret: string) => { userId: string };

// ============================================================================
// Database Query Helpers
// ============================================================================

/**
 * Get version for a record in a table by id.
 * Returns undefined if the record does not exist.
 *
 * @param db - Database client
 * @param table - Logical table name
 * @param id - Record ID
 * @returns The record version, or undefined if not found
 * @complexity O(1) database query
 */
async function getRecordVersion(
  db: WebSocketDeps['db'],
  table: string,
  id: string,
): Promise<number | undefined> {
  // Map table names to their actual table names
  const tableMap: Record<string, string> = {
    users: USERS_TABLE,
  };

  const actualTable = tableMap[table];
  if (actualTable == null || actualTable === '') return undefined;

  const row = await db.queryOne<{ version: number }>(
    select(actualTable).columns('version').where(eq('id', id)).limit(1).toSql(),
  );

  return row?.version;
}

// ============================================================================
// WebSocket Adapter
// ============================================================================

/**
 * Adapt a ws WebSocket to the minimal PubSubWebSocket interface.
 * The ws library's WebSocket always has readyState and send(),
 * so this is a safe structural cast.
 *
 * @param socket - ws WebSocket instance
 * @returns Minimal PubSubWebSocket interface
 * @complexity O(1)
 */
function asPubSubWebSocket(socket: WebSocket): PubSubWebSocket {
  return socket;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type guard to verify a value is a string record.
 * Used for cookie parsing results.
 *
 * @param value - Value to check
 * @returns Whether the value is a Record<string, string>
 * @complexity O(n) where n is the number of keys
 */
function isStringRecord(value: unknown): value is Record<string, string> {
  if (value == null || typeof value !== 'object') return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
}

/**
 * Reject WebSocket upgrade with HTTP error response.
 * Writes a raw HTTP response and destroys the socket.
 *
 * @param socket - Raw TCP socket
 * @param statusCode - HTTP status code
 * @param message - Error message
 * @complexity O(1)
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

// ============================================================================
// Table Whitelist for WebSocket Subscriptions
// ============================================================================

/**
 * Whitelist of allowed table names for WebSocket subscriptions.
 * Only tables in this set can be queried via subscription keys.
 * This prevents SQL injection and unauthorized data access.
 *
 * @complexity O(1) lookup
 */
const ALLOWED_SUBSCRIPTION_TABLES = new Set([
  'users',
  'sessions',
  'posts',
  'comments',
  'notifications',
]);

/**
 * Validate subscription key format and table name.
 * Key must be: record:{table}:{id}
 * - table: must be in whitelist, alphanumeric and underscores only
 * - id: must be alphanumeric, hyphens, and underscores only (UUID-safe)
 *
 * @param key - Subscription key to validate
 * @returns Validation result with parsed table and id
 * @complexity O(1)
 */
function isValidSubscriptionKey(key: string): { valid: boolean; table?: string; id?: string } {
  const parts = key.split(':');
  if (parts.length !== 3 || parts[0] !== 'record') {
    return { valid: false };
  }

  const [, table, id] = parts;
  if (table == null || table === '' || id == null || id === '') {
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

/**
 * Send initial subscription data to a newly subscribed client.
 * Fetches the current version for the record and sends it to the client.
 *
 * @param ctx - Realtime module dependencies
 * @param socket - WebSocket client
 * @param key - Subscription key (format: "record:{table}:{id}")
 * @complexity O(1) database query
 */
async function sendInitialData(ctx: WebSocketDeps, socket: WebSocket, key: string): Promise<void> {
  // Validate subscription key format and table whitelist
  const validation = isValidSubscriptionKey(key);
  if (!validation.valid || (validation.table ?? '') === '' || (validation.id ?? '') === '') {
    ctx.log.warn('Invalid subscription key format or non-whitelisted table', { key });
    return;
  }

  const { table, id } = validation;

  try {
    const version = await getRecordVersion(ctx.db, table ?? '', id ?? '');

    if (version !== undefined) {
      socket.send(JSON.stringify({ type: 'update', key, version }));
    }
  } catch (err) {
    ctx.log.warn('Failed to fetch initial data for subscription', { err, key });
  }
}

// ============================================================================
// WebSocket Registration
// ============================================================================

/**
 * WebSocket registration options.
 *
 * @param verifyToken - Token verification function injected by the server
 */
export interface WebSocketRegistrationOptions {
  /** Token verification function for authenticating WebSocket connections */
  verifyToken: TokenVerifier;
}

/**
 * Register WebSocket support on a Fastify server.
 *
 * Creates a WebSocket server (noServer mode) and handles HTTP upgrade
 * requests on the /ws path. Performs CSRF validation and JWT authentication
 * before establishing the connection.
 *
 * @param server - Fastify server instance
 * @param ctx - Realtime module dependencies
 * @param options - Registration options including token verifier
 * @complexity O(1) for registration; per-connection cost is O(1)
 */
export function registerWebSocket(
  server: FastifyInstance,
  ctx: WebSocketDeps,
  options: WebSocketRegistrationOptions,
): void {
  // Create WebSocket server without HTTP server (handle upgrade manually)
  const wss = new WebSocketServer({ noServer: true });
  markPluginRegistered();

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
    // WebSocket hijacking attacks.

    // Extract CSRF token from cookie
    const rawCookies: unknown = parseCookies(request.headers.cookie);
    const cookies = isStringRecord(rawCookies) ? rawCookies : {};
    const csrfCookie = cookies['_csrf'];

    // Extract CSRF token from request (query param or subprotocol)
    let csrfToken: string | undefined;

    // Check query parameter first
    csrfToken = url.searchParams.get('csrf') ?? undefined;

    // Check Sec-WebSocket-Protocol header (format: csrf.<token>)
    if (
      (csrfToken == null || csrfToken === '') &&
      request.headers['sec-websocket-protocol'] != null
    ) {
      const protocols = request.headers['sec-websocket-protocol'].split(',').map((p) => p.trim());
      const csrfProtocol = protocols.find((p) => p.startsWith('csrf.'));
      if (csrfProtocol != null && csrfProtocol !== '') {
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
      handleConnection(ws, request, ctx, options.verifyToken);
    });
  });

  ctx.log.info('WebSocket support registered on /ws');
}

/**
 * Handle a new WebSocket connection after upgrade.
 *
 * Authenticates the connection via JWT token (from subprotocol header or
 * cookie), then sets up message handlers for subscription management.
 *
 * @param socket - WebSocket connection
 * @param req - Original HTTP upgrade request
 * @param ctx - Realtime module dependencies
 * @param verifyToken - Token verification function
 * @complexity O(1) for setup; message handling is O(1) per message
 */
function handleConnection(
  socket: WebSocket,
  req: IncomingMessage,
  ctx: WebSocketDeps,
  verifyToken: TokenVerifier,
): void {
  // 1. Authentication
  // WebSockets don't support custom headers in browsers, so we check:
  // - 'sec-websocket-protocol' header (standard workaround for JWT)
  // - Cookies (HTTP-only cookies are automatically sent)
  //
  // NOTE: Query parameter tokens are NOT supported due to security risks

  let token: string | undefined;

  // Check protocol header (subprotocol) - primary method for browsers
  if (req.headers['sec-websocket-protocol'] != null) {
    const protocols = req.headers['sec-websocket-protocol'].split(',').map((p) => p.trim());
    // Find token (skip known protocol names and CSRF tokens)
    token = protocols.find(
      (p) => !['graphql', 'json', 'Bearer'].includes(p) && !p.startsWith('csrf.'),
    );
  }

  // Check cookies (accessToken cookie for seamless auth)
  if (token == null || token === '') {
    const rawCookies: unknown = parseCookies(req.headers.cookie);
    const cookies = isStringRecord(rawCookies) ? rawCookies : {};
    const accessToken = cookies['accessToken'];
    if (typeof accessToken === 'string') {
      token = accessToken;
    }
  }

  if (token == null || token === '') {
    socket.close(1008, 'Authentication required');
    return;
  }

  try {
    const user = verifyToken(token, ctx.config.auth.jwt.secret);

    // Track connection
    const connCount = incrementConnections();
    ctx.log.debug('WebSocket client connected', {
      userId: user.userId,
      activeConnections: connCount,
    });

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

      pubsub.handleMessage(asPubSubWebSocket(socket), message, (key: SubscriptionKey) => {
        void sendInitialData(ctx, socket, key);
      });
    });

    socket.on('close', () => {
      const remaining = decrementConnections();
      ctx.log.debug('WebSocket client disconnected', {
        userId: user.userId,
        activeConnections: remaining,
      });
      pubsub.cleanup(asPubSubWebSocket(socket));
    });

    socket.on('error', (err: Error) => {
      const remaining = decrementConnections();
      ctx.log.error('WebSocket error', { err, userId: user.userId, activeConnections: remaining });
      pubsub.cleanup(asPubSubWebSocket(socket));
    });
  } catch (err) {
    ctx.log.warn('WebSocket token verification failed', { err });
    socket.close(1008, 'Invalid token');
  }
}
