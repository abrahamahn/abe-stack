// Service Types - Identifiers for dependency injection
export const TYPES = {
  // INFRASTRUCTURE LAYER
  // Core infrastructure services
  ConfigService: Symbol.for("ConfigService"),
  AppConfig: Symbol.for("AppConfig"),
  DatabaseConfig: Symbol.for("DatabaseConfig"),
  ApiConfig: Symbol.for("ApiConfig"),
  LoggerService: Symbol.for("LoggerService"),
  LegacyLogger: Symbol.for("LegacyLogger"),
  LoggingConfig: Symbol.for("LoggingConfig"),
  LoggerExample: Symbol.for("LoggerExample"),
  ConfigExample: Symbol.for("ConfigExample"),
  CacheService: Symbol.for("CacheService"),
  CacheAdapter: Symbol.for("CacheAdapter"),
  CacheServiceConfig: Symbol.for("CacheServiceConfig"),
  CachePerformanceReporter: Symbol.for("CachePerformanceReporter"),
  CacheExample: Symbol.for("CacheExample"),
  StorageService: Symbol.for("StorageService"),
  StorageConfig: Symbol.for("StorageConfig"),
  StorageProvider: Symbol.for("StorageProvider"),
  JobService: Symbol.for("JobService"),
  PersistentJobQueue: Symbol.for("PersistentJobQueue"),
  JobQueueManager: Symbol.for("JobQueueManager"),
  JobStorage: Symbol.for("JobStorage"),
  JobStorageConfig: Symbol.for("JobStorageConfig"),
  JobServiceConfig: Symbol.for("JobServiceConfig"),
  WebSocketService: Symbol.for("WebSocketService"),
  EventEmitter: Symbol.for("EventEmitter"),
  MetricsService: Symbol.for("MetricsService"),
  TransactionService: Symbol.for("TransactionService"),
  TransactionManager: Symbol.for("TransactionManager"),
  ValidationService: Symbol.for("ValidationService"),
  EncryptionService: Symbol.for("EncryptionService"),
  TokenService: Symbol.for("TokenService"),
  EmailService: Symbol.for("EmailService"),
  SessionService: Symbol.for("SessionService"),
  AuthService: Symbol.for("AuthService"),
  ErrorHandler: Symbol.for("ErrorHandler"),
  ApplicationLifecycle: Symbol.for("ApplicationLifecycle"),
  DatabaseService: Symbol.for("DatabaseService"),
  SearchProvider: Symbol.for("SearchProvider"),
  GeoProvider: Symbol.for("GeoProvider"),
  MessageBus: Symbol.for("MessageBus"),
  DatabaseServer: Symbol.for("DatabaseServer"),
  FileJobStorageConfig: Symbol.for("FileJobStorageConfig"),

  // Security infrastructure services
  TokenStorage: Symbol.for("TokenStorage"),
  TokenBlacklist: Symbol.for("TokenBlacklist"),
  TokenManager: Symbol.for("TokenManager"),
  AuthStrategies: Symbol.for("AuthStrategies"),
  SecurityLogger: Symbol.for("SecurityLogger"),
  SecurityAuditTrail: Symbol.for("SecurityAuditTrail"),
  CorsConfig: Symbol.for("CorsConfig"),
  WsAuthentication: Symbol.for("WsAuthentication"),
  CookieService: Symbol.for("CookieService"),
  SecurityMiddlewareService: Symbol.for("SecurityMiddlewareService"),

  // Server management
  ServerManager: Symbol.for("ServerManager"),

  // Middleware components
  ValidationMiddleware: Symbol.for("ValidationMiddleware"),
  RateLimitMiddleware: Symbol.for("RateLimitMiddleware"),

  // Processor components
  ImageProcessor: Symbol.for("ImageProcessor"),
  StreamProcessor: Symbol.for("StreamProcessor"),
  MediaProcessor: Symbol.for("MediaProcessor"),

  // DATABASE LAYER
  // Base repository
  BaseRepository: Symbol.for("BaseRepository"),

  // Auth repositories
  UserRepository: Symbol.for("UserRepository"),
  UserRoleRepository: Symbol.for("UserRoleRepository"),
  UserPreferencesRepository: Symbol.for("UserPreferencesRepository"),
  RoleRepository: Symbol.for("RoleRepository"),
  RolePermissionRepository: Symbol.for("RolePermissionRepository"),
  PermissionRepository: Symbol.for("PermissionRepository"),
  TokenRepository: Symbol.for("TokenRepository"),
  PasswordResetTokenRepository: Symbol.for("PasswordResetTokenRepository"),
  VerificationTokenRepository: Symbol.for("VerificationTokenRepository"),

  // Auth services
  VerificationService: Symbol.for("VerificationService"),
  AuthController: Symbol.for("AuthController"),

  // Media repositories
  MediaRepository: Symbol.for("MediaRepository"),
  MediaCollectionRepository: Symbol.for("MediaCollectionRepository"),
  MediaTagRepository: Symbol.for("MediaTagRepository"),
  MediaCommentRepository: Symbol.for("MediaCommentRepository"),

  // Social repositories
  UserProfileRepository: Symbol.for("UserProfileRepository"),
  FollowRepository: Symbol.for("FollowRepository"),
  PostRepository: Symbol.for("PostRepository"),
  CommentRepository: Symbol.for("CommentRepository"),
  LikeRepository: Symbol.for("LikeRepository"),
  NotificationRepository: Symbol.for("NotificationRepository"),

  // Messaging repositories
  ConversationRepository: Symbol.for("ConversationRepository"),
  MessageRepository: Symbol.for("MessageRepository"),

  // Moderation repositories
  ReportRepository: Symbol.for("ReportRepository"),
  ContentModerationRepository: Symbol.for("ContentModerationRepository"),
  BlockRepository: Symbol.for("BlockRepository"),

  // Analytics repositories
  UserAnalyticsRepository: Symbol.for("UserAnalyticsRepository"),
  ContentAnalyticsRepository: Symbol.for("ContentAnalyticsRepository"),
  EngagementAnalyticsRepository: Symbol.for("EngagementAnalyticsRepository"),

  // SERVICE LAYER
  // Core services
  GeoService: Symbol.for("GeoService"),
  GeoMiddleware: Symbol.for("GeoMiddleware"),
  SearchService: Symbol.for("SearchService"),
  MessagingService: Symbol.for("MessagingService"),
  JobProcessorRegistry: Symbol.for("JobProcessorRegistry"),
  JobProcessor: Symbol.for("JobProcessor"),
  JobOrchestrationService: Symbol.for("JobOrchestrationService"),

  // User services
  UserService: Symbol.for("UserService"),
  ProfileService: Symbol.for("ProfileService"),

  // Authentication services
  AuthenticationService: Symbol.for("AuthenticationService"),
  PermissionService: Symbol.for("PermissionService"),
  RolePermissionService: Symbol.for("RolePermissionService"),
  MfaService: Symbol.for("MfaService"),

  // Social services
  PostService: Symbol.for("PostService"),
  CommentService: Symbol.for("CommentService"),
  LikeService: Symbol.for("LikeService"),
  FollowService: Symbol.for("FollowService"),
  NotificationService: Symbol.for("NotificationService"),
  FeedService: Symbol.for("FeedService"),

  // Media services
  MediaService: Symbol.for("MediaService"),
  MediaProcessingService: Symbol.for("MediaProcessingService"),

  // Messaging services
  MessageService: Symbol.for("MessageService"),
  ChatService: Symbol.for("ChatService"),

  // Moderation services
  ModerationService: Symbol.for("ModerationService"),
  ReportingService: Symbol.for("ReportingService"),
  ContentFilterService: Symbol.for("ContentFilterService"),

  // Analytics services
  AnalyticsService: Symbol.for("AnalyticsService"),
  EngagementAnalyticsService: Symbol.for("EngagementAnalyticsService"),

  // Search services

  // Discovery services
  RecommendationService: Symbol.for("RecommendationService"),
  TrendingService: Symbol.for("TrendingService"),

  // Shared utility services
  MailService: Symbol.for("MailService"),
  SmsService: Symbol.for("SmsService"),
  WebhookService: Symbol.for("WebhookService"),
  PushNotificationService: Symbol.for("PushNotificationService"),

  // API LAYER
  RequestLogger: Symbol.for("RequestLogger"),

  // Job System
  JobExample: Symbol.for("JobExample"),

  // Background task system
  BackgroundTaskQueue: Symbol.for("BackgroundTaskQueue"),
  TaskStorage: Symbol.for("TaskStorage"),

  // Controller Layer
  SessionController: Symbol.for("SessionController"),
  UserController: Symbol.for("UserController"),
  RolePermissionController: Symbol.for("RolePermissionController"),

  // Email services
  EmailTemplateService: Symbol.for("EmailTemplateService"),

  // Template services
  TemplateEngine: Symbol.for("TemplateEngine"),

  // Security services
  SecurityAuditLogger: Symbol.for("SecurityAuditLogger"),
  PasswordService: Symbol.for("PasswordService"),

  // Auth Router
  AuthRouter: Symbol.for("AuthRouter"),
};

export default TYPES;
