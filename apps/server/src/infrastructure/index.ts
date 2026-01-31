// apps/server/src/infrastructure/index.ts
/**
 * Infrastructure Layer — Local Adapters Only
 *
 * Server-specific infrastructure wiring.
 * Package code should be imported directly from @abe-stack/* packages.
 */

// HTTP (Security headers, CORS — local middleware wrappers)
export { applyCors, applySecurityHeaders, handlePreflight, type CorsOptions } from './http';

// Proxy Validation (IP address validation with CIDR support — local wrappers)
export {
  getValidatedClientIp,
  ipMatchesCidr,
  isFromTrustedProxy,
  isValidIp,
  isValidIpv4,
  isValidIpv6,
  parseCidr,
  parseXForwardedFor,
  validateCidrList,
  type ForwardedInfo,
  type ProxyValidationConfig,
} from './http/middleware';

// Router (Local router with AppContext handler signatures)
export {
  createRouteMap,
  protectedRoute,
  publicRoute,
  registerRouteMap,
  type BaseRouteDefinition,
  type HttpMethod,
  type ProtectedHandler,
  type PublicHandler,
  type RouteDefinition,
  type RouteHandler,
  type RouteMap,
  type RouteResult,
  type RouterOptions,
  type ValidationSchema,
} from './http/router';

// Pagination (local wrappers)
export {
  createPaginationHelpers,
  createPaginationMiddleware,
  type PaginationContext,
  type PaginationHelpers,
  type PaginationMiddlewareOptions,
  type PaginationRequest,
} from './http/pagination';

// WebSocket (local — shares module-level state between register and getStats)
export { getWebSocketStats, registerWebSocket, type WebSocketStats } from './messaging/websocket';

// Search (local — server-specific SQL/Elasticsearch adapters)
export { SearchProviderFactory, getSearchProviderFactory } from './search';
export type { SearchProviderType, SearchResultWithMetrics, ServerSearchProvider } from './search';

// Health Checks (local — integrates all infrastructure components)
export {
  checkDatabase,
  checkEmail,
  checkPubSub,
  checkRateLimit,
  checkStorage,
  checkWebSocket,
  getDetailedHealth,
  logStartupSummary,
  type DetailedHealthResponse,
  type LiveResponse,
  type OverallStatus,
  type ReadyResponse,
  type RoutesResponse,
  type ServiceHealth,
  type ServiceStatus,
  type StartupSummaryOptions,
} from './monitor/health';

// Logger (local — server-specific logging middleware and context)
export {
  LOG_LEVELS,
  createJobCorrelationId,
  createJobLogger,
  createLogger,
  createRequestContext,
  createRequestLogger,
  generateCorrelationId,
  getOrCreateCorrelationId,
  registerLoggingMiddleware,
  shouldLog,
  type LogData,
  type LogLevel,
  type Logger,
  type LoggerConfig,
  type RequestContext,
} from './monitor/logger';

// Notifications (local factory — thin adapter over @abe-stack/notifications)
export {
  FcmProvider,
  createFcmProvider,
  createNotificationService,
  createNotificationServiceFromEnv,
  type FcmConfig,
  type NotificationFactoryOptions,
  type NotificationService,
  type ProviderConfig,
  type PushNotificationProvider,
  type SendOptions,
  type SubscriptionWithId,
} from './notifications';
