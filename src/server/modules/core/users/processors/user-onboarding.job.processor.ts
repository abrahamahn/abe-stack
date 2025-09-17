import { User } from "./User";
import { UserProfileService } from "./UserProfileService";
import { BaseService } from "../../base/baseService";
import { EmailService } from "../email/EmailService";

/**
 * Data for user onboarding job
 */
export interface UserOnboardingJobData {
  /**
   * User ID
   */
  userId: string;

  /**
   * Additional data
   */
  additionalData?: Record<string, any>;
}

/**
 * Result of onboarding job
 */
export interface OnboardingResult {
  /**
   * Whether the job was successful
   */
  success: boolean;

  /**
   * Error message if job failed
   */
  error?: string;

  /**
   * Steps that were completed
   */
  completedSteps: string[];
}

/**
 * Job processor for user onboarding tasks
 */
export class UserOnboardingJobProcessor extends BaseService {
  /**
   * Email service instance
   */
  private emailService: EmailService;

  /**
   * User profile service instance
   */
  private userProfileService: UserProfileService;

  /**
   * Constructor
   */
  constructor() {
    super();
    this.emailService = new EmailService();
    this.userProfileService = new UserProfileService();
  }

  /**
   * Process a user onboarding job
   * @param data - Job data
   */
  async process(data: UserOnboardingJobData): Promise<OnboardingResult> {
    console.log("Starting user onboarding process:", data);

    const completedSteps: string[] = [];

    try {
      // Step 1: Send welcome email
      await this.sendWelcomeEmail(data.userId);
      completedSteps.push("welcome_email");

      // Step 2: Set up basic profile
      await this.setupBasicProfile(data.userId, data.additionalData);
      completedSteps.push("basic_profile");

      // Step 3: Add to default groups
      await this.addToDefaultGroups(data.userId);
      completedSteps.push("default_groups");

      // Step 4: Send admin notification
      await this.notifyAdmin(data.userId);
      completedSteps.push("admin_notification");

      return {
        success: true,
        completedSteps,
      };
    } catch (error) {
      console.error("Error in onboarding process:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        completedSteps,
      };
    }
  }

  /**
   * Send welcome email to the user
   * @param userId - User ID
   */
  private async sendWelcomeEmail(userId: string): Promise<void> {
    // In a real implementation, you would:
    // 1. Fetch the user from the database
    // 2. Construct appropriate email content
    // 3. Send the email using a template

    console.log(`Sending welcome email to user ${userId}`);

    // Simulate sending the welcome email
    await this.emailService.sendEmail({
      to: `user-${userId}@example.com`,
      subject: "Welcome to our platform!",
      html: `<h1>Welcome to Our Platform</h1><p>Thank you for joining us, ${userId}!</p>`,
    });
  }

  /**
   * Set up basic profile for the user
   * @param userId - User ID
   * @param data - Additional data
   */
  private async setupBasicProfile(
    userId: string,
    data?: Record<string, any>
  ): Promise<void> {
    console.log(`Setting up basic profile for user ${userId}`);

    // Simulate user object
    const user: User = {
      id: userId,
      email: `user-${userId}@example.com`,
      password: "",
      roles: ["user"],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create or update the profile
    const profile = await this.userProfileService.getProfile(userId);

    if (profile) {
      // Update existing profile with any additional data
      if (data) {
        await this.userProfileService.updateProfile(userId, data);
      }
    } else {
      // Create new profile
      await this.userProfileService.createProfile(user, data);
    }
  }

  /**
   * Add user to default groups
   * @param userId - User ID
   */
  private async addToDefaultGroups(userId: string): Promise<void> {
    console.log(`Adding user ${userId} to default groups`);

    // In a real implementation, you would:
    // 1. Determine which groups are default
    // 2. Add the user to each group

    // This is a placeholder implementation
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Notify admin about new user
   * @param userId - User ID
   */
  private async notifyAdmin(userId: string): Promise<void> {
    console.log(`Notifying admin about new user ${userId}`);

    // In a real implementation, you would:
    // 1. Get admin email addresses
    // 2. Send notification email

    // Simulate sending admin notification
    await this.emailService.sendEmail({
      to: "admin@example.com",
      subject: "New User Registration",
      html: `<h1>New User Registration</h1><p>A new user with ID ${userId} has registered.</p>`,
    });
  }
}
