/**
 * Infrastructure job queue and service exports
 */

// Core types
export { JobType, DependencyResolutionStrategy } from "./JobTypes";
export type {
  JobPriority,
  JobOptions,
  EmailNotificationJobData,
} from "./JobTypes";

// Job service interfaces and implementations
export type {
  IJobService,
  JobProcessor,
  JobResult,
  JobStats,
  DependencyStatus,
} from "./IJobService";
export { JobService } from "./JobService";
export type { JobServiceConfig } from "./JobService";

// Job queue types
export type { Job } from "./JobQueue";

// Storage
export type { IJobStorage, JobData, JobStatus } from "./storage/IJobStorage";
export { FileJobStorage } from "./storage/FileJobStorage";
export type { FileJobStorageConfig } from "./storage/FileJobStorage";

/* 
Note: Legacy exports have been removed. Import from the specific files 
above if needed for backward compatibility during migration.
*/
