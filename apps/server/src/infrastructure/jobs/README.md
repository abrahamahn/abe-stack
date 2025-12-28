# 🔄 Background Jobs System

## 📋 Purpose

The background jobs system provides a robust framework for managing long-running and scheduled tasks, offering:

- Reliable execution of background processing
- Job scheduling with various timing options
- Job prioritization and queue management
- Persistence and recovery of job data
- Monitoring and reporting of job status
- Graceful handling of job failures and retries

This module allows the application to offload time-consuming operations from the request-response cycle, improving responsiveness and resource utilization.

## 🧩 Key Components

### 1️⃣ Job Service

- **`JobService`**: Core service for managing and executing jobs
- **`IJobService`**: Interface defining the job service contract
- Handles job registration, scheduling, and execution

### 2️⃣ Job Types and Definitions

- **`JobTypes`**: Type definitions for job data and configuration
- Provides type-safe job creation and handling
- Defines job status and result types

### 3️⃣ Storage Providers

- **`storage/`**: Persistence mechanisms for job data
- Ensures jobs survive application restarts
- Supports various storage backends

## 🛠️ Usage Instructions

### Creating and Scheduling Jobs

```typescript
import { inject, injectable } from "inversify";
import { IJobService, JobScheduleOptions } from "@/server/infrastructure/jobs";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class EmailService {
  constructor(@inject(TYPES.JobService) private jobService: IJobService) {}

  async scheduleWelcomeEmail(userId: string, email: string): Promise<string> {
    // Create a scheduled job
    const jobId = await this.jobService.schedule({
      type: "SEND_EMAIL",
      data: {
        template: "welcome",
        recipient: email,
        userId,
      },
      options: {
        priority: "normal",
        delay: 60000, // 1 minute delay
        retries: 3,
      },
    });

    return jobId;
  }

  async sendBulkPromotionEmails(emails: string[]): Promise<string[]> {
    // Schedule multiple jobs
    const jobs = emails.map((email) => ({
      type: "SEND_EMAIL",
      data: {
        template: "promotion",
        recipient: email,
      },
    }));

    const jobIds = await this.jobService.scheduleMany(jobs);
    return jobIds;
  }
}
```

### Processing Jobs

```typescript
import { inject, injectable } from "inversify";
import { IJobService, JobHandler } from "@/server/infrastructure/jobs";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class JobProcessor {
  constructor(
    @inject(TYPES.JobService) private jobService: IJobService,
    @inject(TYPES.EmailService) private emailService: IEmailService,
  ) {}

  initialize(): void {
    // Register handlers for different job types
    this.jobService.registerHandler(
      "SEND_EMAIL",
      this.handleEmailJob.bind(this),
    );
    this.jobService.registerHandler(
      "GENERATE_REPORT",
      this.handleReportJob.bind(this),
    );

    // Start processing jobs
    this.jobService.start();
  }

  async handleEmailJob(job: JobData): Promise<void> {
    const { template, recipient, ...data } = job.data;

    // Process the job
    await this.emailService.sendEmail({
      template,
      to: recipient,
      data,
    });
  }

  async handleReportJob(job: JobData): Promise<void> {
    // Process report generation
    // ...
  }
}
```

### Monitoring Job Status

```typescript
import { inject, injectable } from "inversify";
import { IJobService } from "@/server/infrastructure/jobs";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class JobMonitor {
  constructor(@inject(TYPES.JobService) private jobService: IJobService) {}

  async getJobStatus(jobId: string): Promise<JobStatus> {
    return this.jobService.getJobStatus(jobId);
  }

  async getActiveJobs(): Promise<JobInfo[]> {
    return this.jobService.getJobs({ status: "active" });
  }

  async getFailedJobs(): Promise<JobInfo[]> {
    return this.jobService.getJobs({ status: "failed" });
  }

  async retryFailedJobs(): Promise<void> {
    const failedJobs = await this.getFailedJobs();

    for (const job of failedJobs) {
      await this.jobService.retryJob(job.id);
    }
  }
}
```

## 🏗️ Architecture Decisions

### In-Memory Queue with Persistence

- **Decision**: Use in-memory queue with persistent storage
- **Rationale**: Balances performance with reliability
- **Benefit**: Fast processing with ability to recover after crashes

### Type-Safe Job Definitions

- **Decision**: Use TypeScript types for job definitions
- **Rationale**: Prevents errors in job data structure
- **Implementation**: Strongly typed job data and handler signatures

### Job Prioritization

- **Decision**: Implement priority levels for jobs
- **Rationale**: Ensures critical jobs are processed first
- **Implementation**: Multiple queues for different priority levels

### Graceful Failure Handling

- **Decision**: Implement retry mechanism with backoff
- **Rationale**: Increases reliability for transient failures
- **Implementation**: Configurable retry count and delay between attempts

## ⚙️ Setup and Configuration Notes

### Job Service Configuration

Configure the job service with appropriate options:

```typescript
import { JobService } from "@/server/infrastructure/jobs";
import { FileJobStorage } from "@/server/infrastructure/jobs/storage";

const jobService = new JobService({
  storage: new FileJobStorage("./storage/jobs"),
  concurrency: 5, // Process up to 5 jobs concurrently
  pollInterval: 1000, // Check for new jobs every second
  defaultRetryLimit: 3, // Default retry limit
  defaultRetryDelay: 60000, // 1 minute between retries
  defaultTimeout: 300000, // 5 minute timeout for jobs
});
```

### Storage Configuration

Different storage providers have specific configuration:

```typescript
// File-based storage
const fileStorage = new FileJobStorage({
  directory: "./storage/jobs",
  retention: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Database storage (if available)
const dbStorage = new DatabaseJobStorage({
  tableName: "background_jobs",
  connection: dbConnection,
});
```

### Application Integration

Integrate with the application lifecycle:

```typescript
import { ApplicationLifecycle } from "@/server/infrastructure/lifecycle";
import { JobService } from "@/server/infrastructure/jobs";

export async function configureJobs(
  app: ApplicationLifecycle,
  jobService: JobService,
): Promise<void> {
  // Register job handlers
  registerJobHandlers(jobService);

  // Start processing on application start
  app.onStart(async () => {
    await jobService.start();
  });

  // Gracefully stop on application shutdown
  app.onShutdown(async () => {
    await jobService.stop();
  });
}
```

### Job Types Registration

For type safety, register job types:

```typescript
// In a central types definition file
export interface JobTypeMap {
  SEND_EMAIL: {
    template: string;
    recipient: string;
    subject?: string;
    data?: Record<string, any>;
  };
  GENERATE_REPORT: {
    reportType: string;
    userId: string;
    parameters: Record<string, any>;
  };
  // Add other job types...
}
```
