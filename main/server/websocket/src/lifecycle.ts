// main/server/websocket/src/lifecycle.ts
/**
 * WebSocket Lifecycle Management
 *
 * Handles WebSocket connection setup, authentication, CSRF validation,
 * and message routing. Uses the ws library directly with Fastify's
 * HTTP server for upgrade handling.
 *
 * @module websocket/lifecycle
 */

import { eq, select } from '@bslt/db';
import { validateCsrfToken } from '@bslt/server-engine';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  ERROR_MESSAGES,
  HTTP_STATUS,
  WEBSOCKET_PATH,
  WS_CLOSE_POLICY_VIOLATION,
  parseCookies,
  parseRecordKey,
} from '@bslt/shared';
import { WebSocketServer } from 'ws';

import { decrementConnections, incrementConnections, markPluginRegistered } from './stats';

import type { DbClient } from '@bslt/db';
import type {
  Logger,
  WebSocket as PubSubWebSocket,
  ServerMessage,
  SubscriptionKey,
  SubscriptionManager,
} from '@bslt/shared';
import type { FastifyInstance } from 'fastify';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { WebSocket } from 'ws';

// ============================================================================
// Local Constants
// ============================================================================

/** Subprotocol prefix for CSRF tokens sent via Sec-WebSocket-Protocol */
const CSRF_SUBPROTOCOL_PREFIX = 'csrf.';

/** Known WebSocket subprotocol names to skip when extracting auth tokens */
const KNOWN_SUBPROTOCOLS = new Set(['graphql', 'json', 'Bearer']);

// ============================================================================
// Types
// ============================================================================

/**
 * WebSocket module dependencies.
 * Structurally compatible with AppContext but decoupled from specific modules.
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
  /** Resolves logical table name to DB table name. Injected by the realtime module. */
  readonly resolveTableName?: (logicalName: string) => string | undefined;
}

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
 * Uses the injected resolveTableName to map logical names to DB tables.
 * Returns undefined if the table is not registered or the record does not exist.
 *
 * @param ctx - WebSocket dependencies (provides resolveTableName and db)
 * @param table - Logical table name
 * @param id - Record ID
 * @returns The record version, or undefined if not found
 * @complexity O(1) database query
 */
async function getRecordVersion(
  ctx: WebSocketDeps,
  table: string,
  id: string,
): Promise<number | undefined> {
  const resolve = ctx.resolveTableName;
  if (resolve == null) return undefined;

  const actualTable = resolve(table);
  if (actualTable == null) return undefined;

  const row = await ctx.db.queryOne<{ version: number }>(
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
// Subscription Helpers
// ============================================================================

/**
 * Send initial subscription data to a newly subscribed client.
 * Fetches the current version for the record and sends it to the client.
 * Uses parseRecordKey from shared for format validation.
 *
 * @param ctx - Realtime module dependencies
 * @param socket - WebSocket client
 * @param key - Subscription key (format: "record:{table}:{id}")
 * @complexity O(1) database query
 */
async function sendInitialData(ctx: WebSocketDeps, socket: WebSocket, key: string): Promise<void> {
  const parsed = parseRecordKey(key);
  if (parsed == null) {
    ctx.log.warn('Invalid subscription key format', { key });
    return;
  }

  try {
    const version = await getRecordVersion(ctx, parsed.table, parsed.id);

    if (version !== undefined) {
      const msg: ServerMessage = { type: 'update', key: key as SubscriptionKey, version };
      socket.send(JSON.stringify(msg));
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
 * requests on the WEBSOCKET_PATH. Performs CSRF validation and JWT
 * authentication before establishing the connection.
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
  const wss = new WebSocketServer({ noServer: true });
  markPluginRegistered();

  const isProd = ctx.config.env === 'production';

  server.server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    if (url.pathname !== WEBSOCKET_PATH) {
      socket.destroy();
      return;
    }

    // =========================================================================
    // CSRF Validation
    // =========================================================================

    const rawCookies: unknown = parseCookies(request.headers.cookie);
    const cookies = isStringRecord(rawCookies) ? rawCookies : {};
    const csrfCookie = cookies[CSRF_COOKIE_NAME];

    let csrfToken: string | undefined;

    // Check query parameter first
    csrfToken = url.searchParams.get('csrf') ?? undefined;

    // Check Sec-WebSocket-Protocol header (format: csrf.<token>)
    if (
      (csrfToken == null || csrfToken === '') &&
      request.headers['sec-websocket-protocol'] != null
    ) {
      const protocols = request.headers['sec-websocket-protocol'].split(',').map((p) => p.trim());
      const csrfProtocol = protocols.find((p) => p.startsWith(CSRF_SUBPROTOCOL_PREFIX));
      if (csrfProtocol != null && csrfProtocol !== '') {
        csrfToken = csrfProtocol.slice(CSRF_SUBPROTOCOL_PREFIX.length);
      }
    }

    const csrfValid = validateCsrfToken(csrfCookie, csrfToken, {
      secret: ctx.config.auth.cookie.secret,
      encrypted: isProd,
      signed: true,
    });

    if (!csrfValid) {
      ctx.log.warn('WebSocket upgrade rejected: invalid CSRF token');
      rejectUpgrade(socket, HTTP_STATUS.FORBIDDEN, 'Forbidden: Invalid CSRF token');
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      handleConnection(ws, request, ctx, options.verifyToken);
    });
  });

  ctx.log.info(`WebSocket support registered on ${WEBSOCKET_PATH}`);
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
    token = protocols.find(
      (p) => !KNOWN_SUBPROTOCOLS.has(p) && !p.startsWith(CSRF_SUBPROTOCOL_PREFIX),
    );
  }

  // Check cookies (accessToken cookie for seamless auth)
  if (token == null || token === '') {
    const rawCookies: unknown = parseCookies(req.headers.cookie);
    const cookies = isStringRecord(rawCookies) ? rawCookies : {};
    const accessToken = cookies[ACCESS_TOKEN_COOKIE_NAME];
    if (typeof accessToken === 'string') {
      token = accessToken;
    }
  }

  if (token == null || token === '') {
    socket.close(WS_CLOSE_POLICY_VIOLATION, ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    return;
  }

  try {
    const user = verifyToken(token, ctx.config.auth.jwt.secret);

    const connCount = incrementConnections();
    ctx.log.debug('WebSocket client connected', {
      userId: user.userId,
      activeConnections: connCount,
    });

    // 2. Setup handlers
    const pubsub = ctx.pubsub;

    socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
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
    socket.close(WS_CLOSE_POLICY_VIOLATION, 'Invalid token');
  }
}
