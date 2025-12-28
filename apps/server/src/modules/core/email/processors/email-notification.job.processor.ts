import { inject, injectable } from "inversify";

import { TYPES } from "../../../../infrastructure/di/types";
import { Job, JobResult } from "../../../../infrastructure/jobs/JobQueue";
import { JobType } from "../../../../infrastructure/jobs/JobTypes";
import { BaseJobProcessor } from "../../../base/baseJobProcessor";
import { EmailService } from "../services/email.service";

import type { ConfigService } from "../../../../infrastructure/config/ConfigService";
import type { EmailNotificationJobData } from "../../../../infrastructure/jobs/JobTypes";
import type { ILoggerService } from "../../../../infrastructure/logging";

/**
 * Email notification job processor
 * Handles sending email notifications using configured email provider
 */
@injectable()
export class EmailNotificationJobProcessor extends BaseJobProcessor<JobType.EMAIL_NOTIFICATION> {
  protected jobType: JobType.EMAIL_NOTIFICATION = JobType.EMAIL_NOTIFICATION;
  protected logger: ILoggerService;

  constructor(
    @inject(TYPES.LoggerService) loggerService: ILoggerService,
    @inject(TYPES.ConfigService) private configService: ConfigService,
    @inject(TYPES.EmailService) private emailService: EmailService
  ) {
    super(loggerService);
    this.logger = loggerService.createLogger("EmailNotificationJobProcessor");
  }

  /**
   * Process an email notification job
   * @param job The job to process
   */
  protected async processJob(
    job: Job<EmailNotificationJobData>
  ): Promise<Partial<JobResult>> {
    const { userId, email, templateId, subject, variables, attachments } =
      job.data;

    this.logger.info(`Sending email notification to ${email}`, {
      userId,
      templateId,
    });

    // Email validation
    if (!this.isValidEmail(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }

    // In development mode, we might want to redirect all emails
    let targetEmail = email;
    if (this.configService.isDevelopment()) {
      const devEmailOverride = this.configService.get(
        "EMAIL_OVERRIDE"
      ) as string;
      if (devEmailOverride) {
        this.logger.debug(
          `Development mode: redirecting email to ${devEmailOverride}`,
          {
            originalRecipient: email,
          }
        );
        targetEmail = devEmailOverride;
      }
    }

    // Send the email using the mail service
    const emailResponse = await this.emailService.sendTemplateEmail(
      templateId,
      variables || {},
      {
        to: targetEmail,
        subject: subject,
        attachments: attachments,
      }
    );

    // Return success result with email delivery info
    return {
      data: {
        messageId: emailResponse.messageId,
        recipient: targetEmail,
        sentAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Simple email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
