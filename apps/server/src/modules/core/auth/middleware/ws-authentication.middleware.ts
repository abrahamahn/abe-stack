import { NextFunction } from "express";

import { ServerEnvironment } from "@/server/infrastructure/config/ConfigService";

import { verifyAccessToken } from "../features/token/token.utils";

// Define basic Socket interface to avoid importing from socket.io
interface Socket {
  handshake?: {
    query?: Record<string, any>;
    headers?: Record<string, any>;
    auth?: Record<string, any>;
  };
  request?: any;
  disconnect: () => void;
  user?: any;
}

/**
 * Extract authentication token from WebSocket handshake or request
 */
export function extractTokenFromSocket(socket: Socket): string | undefined {
  // Try to get token from socket handshake query
  const query = socket.handshake?.query || {};
  if (query.token && typeof query.token === "string") {
    return query.token;
  }

  // Try to get token from socket handshake headers
  const headers = socket.handshake?.headers || {};
  const authHeader = headers.authorization as string | undefined;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try to get token from socket auth object
  const auth = socket.handshake?.auth || {};
  if (auth.token && typeof auth.token === "string") {
    return auth.token;
  }

  // Try to get token from request cookies (when the socket adapter uses cookies)
  if (
    socket.request &&
    (socket.request as any).cookies &&
    (socket.request as any).cookies.authToken
  ) {
    return (socket.request as any).cookies.authToken;
  }

  return undefined;
}

/**
 * Attach user data to socket object
 */
export function attachUserToSocket(socket: Socket, userData: any): void {
  socket.user = userData;
}

/**
 * WebSocket authentication middleware
 * Validates token and attaches user data to socket
 */
export function authenticateWebSocket(env: ServerEnvironment, options?: any) {
  return async (socket: Socket, next: NextFunction) => {
    // Extract token from socket
    const token = extractTokenFromSocket(socket);

    if (!token) {
      socket.disconnect();
      return;
    }

    // Validate token
    const validation = await verifyAccessToken(env, token);

    if (!validation.valid) {
      socket.disconnect();
      return;
    }

    // Extract user data from token
    const payload = validation.payload!;
    const userData = {
      id: payload.userId,
      roles: payload.roles || [],
    };

    // Attach user data to socket
    attachUserToSocket(socket, userData);

    // Continue to next middleware
    next();
  };
}

/**
 * Check if a socket user has the required role for an action
 */
export function authorizeWebSocketAction(
  socket: Socket,
  requiredRoles: string[]
): boolean {
  if (!socket.user) {
    return false;
  }

  // If no roles required, allow all authenticated users
  if (requiredRoles.length === 0) {
    return true;
  }

  // Check if user has any of the required roles
  const userRoles = socket.user.roles || [];
  return requiredRoles.some((role) => {
    return Array.isArray(userRoles) ? userRoles.includes(role) : false;
  });
}

/**
 * WebSocket authentication middleware using API key
 */
export function authenticateWebSocketWithApiKey(
  validateApiKey: (apiKey: string) => {
    valid: boolean;
    userData?: any;
    error?: string;
  }
) {
  return (socket: Socket, next: NextFunction) => {
    // Try to extract API key from different locations
    const query = socket.handshake?.query || {};
    const headers = socket.handshake?.headers || {};
    const auth = socket.handshake?.auth || {};

    // Check query param first
    let apiKey: string | undefined;
    if (query.api_key && typeof query.api_key === "string") {
      apiKey = query.api_key;
    }
    // Then check header
    else if (headers["x-api-key"]) {
      apiKey = headers["x-api-key"] as string;
    }
    // Then check auth object
    else if (auth.apiKey && typeof auth.apiKey === "string") {
      apiKey = auth.apiKey;
    }

    if (!apiKey) {
      socket.disconnect();
      return;
    }

    // Validate API key
    const validation = validateApiKey(apiKey);

    if (!validation.valid) {
      socket.disconnect();
      return;
    }

    // Attach user data to socket
    attachUserToSocket(socket, validation.userData);

    // Continue to next middleware
    next();
  };
}
