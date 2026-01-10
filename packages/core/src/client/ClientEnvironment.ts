/**
 * ClientEnvironment - Single source of all client-side dependencies
 *
 * This pattern is inspired by chet-stack. Instead of multiple nested
 * React providers (QueryProvider > AuthProvider > ApiProvider > etc.),
 * we create a single environment object that contains everything.
 *
 * Benefits:
 * - Single provider at app root
 * - Access everything via `useEnvironment()` hook
 * - Easy to debug (window.env in development)
 * - Prepared for PubSub, offline support, undo/redo (Phases 4-6)
 */

import type { QueryClient } from '@tanstack/react-query';

/**
 * User type from the API
 */
export type User = {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin' | 'moderator';
};

/**
 * Client configuration
 */
export type ClientConfig = {
  /** Base URL for API calls */
  apiUrl: string;
  /** WebSocket URL for PubSub (Phase 4) */
  wsUrl: string;
  /** Environment mode */
  env: 'development' | 'production' | 'test';
};

/**
 * Authentication state and actions
 */
export type AuthState = {
  /** Current user or null if not authenticated */
  user: User | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether auth state is still loading */
  isLoading: boolean;
  /** Login with email and password */
  login: (email: string, password: string) => Promise<void>;
  /** Register with email, password, and optional name */
  register: (email: string, password: string, name?: string) => Promise<void>;
  /** Logout the current user */
  logout: () => Promise<void>;
  /** Refresh the session (called on app load) */
  refresh: () => Promise<void>;
};

/**
 * API client interface
 */
export type ApiClient = {
  login: (data: { email: string; password: string }) => Promise<{ token: string; user: User }>;
  register: (data: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<{ token: string; user: User }>;
  refresh: () => Promise<{ token: string }>;
  logout: () => Promise<{ message: string }>;
  getCurrentUser: () => Promise<User & { createdAt: string }>;
};

/**
 * PubSub client interface (Phase 4)
 */
export interface PubsubClient {
  subscribe(channel: string, callback: (message: unknown) => void): () => void;
  // Additional methods will be added in Phase 4
}

/**
 * Record cache interface (Phase 5)
 */
export interface RecordCache {
  get<T>(table: string, id: string): T | undefined;
  set<T>(table: string, id: string, record: T): void;
  delete(table: string, id: string): void;
  // Additional methods will be added in Phase 5
}

/**
 * Record storage interface (Phase 5 - IndexedDB)
 */
export interface RecordStorage {
  get<T>(table: string, id: string): Promise<T | undefined>;
  set<T>(table: string, id: string, record: T): Promise<void>;
  delete(table: string, id: string): Promise<void>;
  // Additional methods will be added in Phase 5
}

/**
 * Transaction queue interface (Phase 5)
 */
export interface TransactionQueue {
  enqueue(transaction: unknown): void;
  process(): Promise<void>;
  getPending(): unknown[];
  // Additional methods will be added in Phase 5
}

/**
 * Subscription cache interface (Phase 4)
 */
export interface SubscriptionCache {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown): void;
  invalidate(key: string): void;
  // Additional methods will be added in Phase 4
}

/**
 * Undo/Redo stack interface (Phase 6)
 */
export interface UndoRedoStack {
  push(operation: unknown): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  // Additional methods will be added in Phase 6
}

/**
 * The main ClientEnvironment type
 * This single object contains all client dependencies
 */
export type ClientEnvironment = {
  /** Client configuration */
  config: ClientConfig;
  /** API client for server communication */
  api: ApiClient;
  /** Authentication state and actions */
  auth: AuthState;
  /** React Query client */
  queryClient: QueryClient;
  /** PubSub client for real-time updates (Phase 4, null until implemented) */
  pubsub: PubsubClient | null;
  /** Subscription cache for PubSub data (Phase 4, null until implemented) */
  subscriptionCache: SubscriptionCache | null;
  /** Record cache for in-memory data (Phase 5, null until implemented) */
  recordCache: RecordCache | null;
  /** Record storage for IndexedDB persistence (Phase 5, null until implemented) */
  recordStorage: RecordStorage | null;
  /** Transaction queue for offline support (Phase 5, null until implemented) */
  transactionQueue: TransactionQueue | null;
  /** Undo/Redo stack (Phase 6, null until implemented) */
  undoRedo: UndoRedoStack | null;
};

/**
 * Default configuration values
 */
export const DEFAULT_CLIENT_CONFIG: ClientConfig = {
  apiUrl: 'http://localhost:8080',
  wsUrl: 'ws://localhost:8080',
  env: 'development',
};
