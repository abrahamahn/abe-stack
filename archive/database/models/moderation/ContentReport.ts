import { BaseModel } from "../BaseModel";
import { EntityType } from "../shared/EntityTypes";

export enum ReportType {
  SPAM = "SPAM",
  HARASSMENT = "HARASSMENT",
  HATE_SPEECH = "HATE_SPEECH",
  VIOLENCE = "VIOLENCE",
  NUDITY = "NUDITY",
  COPYRIGHT = "COPYRIGHT",
  OTHER = "OTHER",
}

export enum ReportStatus {
  PENDING = "PENDING",
  IN_REVIEW = "IN_REVIEW",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

export enum ReportSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface ContentReportAttributes extends BaseModel {
  reporterId: string;
  contentId: string;
  contentType: EntityType;
  contentOwnerId?: string;
  type: ReportType;
  description?: string;
  status: ReportStatus;
  severity: ReportSeverity;
  reviewerId?: string;
  resolution?: string;
  reviewNotes?: string;
  evidence?: string[];
  metadata?: Record<string, unknown> | null;
}

export class ContentReport
  extends BaseModel
  implements Omit<ContentReportAttributes, keyof BaseModel>
{
  reporterId: string;
  contentId: string;
  contentType: EntityType;
  contentOwnerId?: string;
  type: ReportType;
  description?: string;
  status: ReportStatus;
  severity: ReportSeverity;
  reviewerId?: string;
  resolution?: string;
  reviewNotes?: string;
  evidence?: string[];
  metadata?: Record<string, unknown> | null;

  constructor(
    data: Partial<ContentReportAttributes> & {
      reporterId: string;
      contentId: string;
      contentType: EntityType;
      type: ReportType;
    },
  ) {
    super();
    this.reporterId = data.reporterId;
    this.contentId = data.contentId;
    this.contentType = data.contentType;
    this.contentOwnerId = data.contentOwnerId;
    this.type = data.type;
    this.description = data.description;
    this.status = data.status || ReportStatus.PENDING;
    this.severity = data.severity || ReportSeverity.MEDIUM;
    this.reviewerId = data.reviewerId;
    this.resolution = data.resolution;
    this.reviewNotes = data.reviewNotes;
    this.evidence = data.evidence || [];
    this.metadata = data.metadata || null;
  }

  /**
   * Validates the report data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.reporterId) {
      throw new Error("Reporter ID is required");
    }

    if (!this.contentId) {
      throw new Error("Content ID is required");
    }

    if (!this.contentType) {
      throw new Error("Content type is required");
    }

    if (!Object.values(EntityType).includes(this.contentType)) {
      throw new Error(`Invalid content type: ${this.contentType}`);
    }

    if (!this.type) {
      throw new Error("Report type is required");
    }

    if (!Object.values(ReportType).includes(this.type)) {
      throw new Error(`Invalid report type: ${this.type}`);
    }

    if (!Object.values(ReportStatus).includes(this.status)) {
      throw new Error(`Invalid report status: ${this.status}`);
    }

    if (!Object.values(ReportSeverity).includes(this.severity)) {
      throw new Error(`Invalid report severity: ${this.severity}`);
    }

    // Description is required for OTHER report type
    if (this.type === ReportType.OTHER && !this.description) {
      throw new Error('Description is required for "OTHER" report type');
    }

    // Resolution is required for RESOLVED or DISMISSED status
    if (
      (this.status === ReportStatus.RESOLVED ||
        this.status === ReportStatus.DISMISSED) &&
      !this.resolution
    ) {
      throw new Error(`Resolution is required for ${this.status} status`);
    }

    // Reviewer ID is required for statuses other than PENDING
    if (this.status !== ReportStatus.PENDING && !this.reviewerId) {
      throw new Error(`Reviewer ID is required for ${this.status} status`);
    }
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): Omit<ContentReportAttributes, "generateId"> & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      reporterId: this.reporterId,
      contentId: this.contentId,
      contentType: this.contentType,
      contentOwnerId: this.contentOwnerId,
      type: this.type,
      description: this.description,
      status: this.status,
      severity: this.severity,
      reviewerId: this.reviewerId,
      resolution: this.resolution,
      reviewNotes: this.reviewNotes,
      evidence: this.evidence,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Start the review process
   * @param reviewerId ID of the moderator reviewing the report
   */
  startReview(reviewerId: string): void {
    if (!reviewerId) {
      throw new Error("Reviewer ID is required");
    }

    if (![ReportStatus.PENDING, ReportStatus.IN_REVIEW].includes(this.status)) {
      throw new Error(
        `Cannot start review for report with status: ${this.status}`,
      );
    }

    this.status = ReportStatus.IN_REVIEW;
    this.reviewerId = reviewerId;
    this.updatedAt = new Date();
  }

  /**
   * Resolve the report
   * @param resolution Resolution description
   */
  resolve(resolution: string): void {
    if (!resolution) {
      throw new Error("Resolution is required");
    }

    if (!this.reviewerId) {
      throw new Error(
        "Report must be assigned to a reviewer before resolution",
      );
    }

    this.status = ReportStatus.RESOLVED;
    this.resolution = resolution;
    this.updatedAt = new Date();
  }

  /**
   * Dismiss the report
   * @param reason Reason for dismissal
   */
  dismiss(reason: string): void {
    if (!reason) {
      throw new Error("Dismissal reason is required");
    }

    if (!this.reviewerId) {
      throw new Error("Report must be assigned to a reviewer before dismissal");
    }

    this.status = ReportStatus.DISMISSED;
    this.resolution = reason;
    this.updatedAt = new Date();
  }

  /**
   * Add review notes
   * @param notes Notes from the reviewer
   */
  addReviewNotes(notes: string): void {
    if (!notes) {
      throw new Error("Notes content is required");
    }

    if (!this.reviewerId) {
      throw new Error("Report must be assigned to a reviewer to add notes");
    }

    this.reviewNotes = notes;
    this.updatedAt = new Date();
  }

  /**
   * Set report severity
   * @param severity The severity level
   */
  setSeverity(severity: ReportSeverity): void {
    if (!Object.values(ReportSeverity).includes(severity)) {
      throw new Error(`Invalid severity level: ${severity}`);
    }

    this.severity = severity;
    this.updatedAt = new Date();
  }

  /**
   * Add evidence to the report
   * @param evidenceUrl URL or reference to evidence
   */
  addEvidence(evidenceUrl: string): void {
    if (!evidenceUrl) {
      throw new Error("Evidence URL is required");
    }

    if (!this.evidence) {
      this.evidence = [];
    }

    if (!this.evidence.includes(evidenceUrl)) {
      this.evidence.push(evidenceUrl);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove evidence from the report
   * @param evidenceUrl URL or reference to evidence
   */
  removeEvidence(evidenceUrl: string): void {
    if (!this.evidence || this.evidence.length === 0) {
      return;
    }

    const initialLength = this.evidence.length;
    this.evidence = this.evidence.filter((url) => url !== evidenceUrl);

    if (this.evidence.length !== initialLength) {
      this.updatedAt = new Date();
    }
  }

  /**
   * Set content owner ID
   * @param ownerId User ID of the content owner
   */
  setContentOwnerId(ownerId: string): void {
    if (!ownerId) {
      throw new Error("Content owner ID is required");
    }

    this.contentOwnerId = ownerId;
    this.updatedAt = new Date();
  }

  /**
   * Check if the report is pending
   */
  isPending(): boolean {
    return this.status === ReportStatus.PENDING;
  }

  /**
   * Check if the report is under review
   */
  isInReview(): boolean {
    return this.status === ReportStatus.IN_REVIEW;
  }

  /**
   * Check if the report has been resolved
   */
  isResolved(): boolean {
    return this.status === ReportStatus.RESOLVED;
  }

  /**
   * Check if the report has been dismissed
   */
  isDismissed(): boolean {
    return this.status === ReportStatus.DISMISSED;
  }

  /**
   * Check if the report is closed (resolved or dismissed)
   */
  isClosed(): boolean {
    return this.isResolved() || this.isDismissed();
  }

  /**
   * Check if the report is high priority (HIGH or CRITICAL severity)
   */
  isHighPriority(): boolean {
    return (
      this.severity === ReportSeverity.HIGH ||
      this.severity === ReportSeverity.CRITICAL
    );
  }
}
