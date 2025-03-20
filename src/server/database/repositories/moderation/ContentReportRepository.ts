import crypto from "crypto";

import { Logger } from "../../../services/dev/logger/LoggerService";
import {
  ContentReport,
  ContentReportAttributes,
  ReportSeverity,
  ReportStatus,
  ReportType,
} from "../../models/moderation/ContentReport";
import { EntityType } from "../../models/shared/EntityTypes";
import { BaseRepository } from "../BaseRepository";

export class ContentReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentReportError";
  }
}

export class ContentReportNotFoundError extends ContentReportError {
  constructor(id: string) {
    super(`Content report with ID ${id} not found`);
    this.name = "ContentReportNotFoundError";
  }
}

export class ContentReportRepository extends BaseRepository<ContentReportAttributes> {
  private static instance: ContentReportRepository;
  protected logger = new Logger("ContentReportRepository");
  protected tableName = "content_reports";
  protected columns = [
    "id",
    "reporter_id as reporterId",
    "content_id as contentId",
    "content_type as contentType",
    "content_owner_id as contentOwnerId",
    "type",
    "description",
    "status",
    "severity",
    "reviewer_id as reviewerId",
    "resolution",
    "review_notes as reviewNotes",
    "evidence",
    "metadata",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ContentReportRepository {
    if (!ContentReportRepository.instance) {
      ContentReportRepository.instance = new ContentReportRepository();
    }
    return ContentReportRepository.instance;
  }

  /**
   * Create a new content report
   * @param report The report to create
   * @returns The created report
   */
  async create(report: ContentReport): Promise<ContentReport> {
    try {
      // Validate the report before saving
      report.validate();

      // Generate ID if not provided
      if (!report.id) {
        report.id = crypto.randomUUID();
      }

      const evidenceJson = report.evidence
        ? JSON.stringify(report.evidence)
        : null;
      const metadataJson = report.metadata
        ? JSON.stringify(report.metadata)
        : null;

      const query = `
        INSERT INTO ${this.tableName} (
          id, reporter_id, content_id, content_type, content_owner_id, 
          type, description, status, severity, reviewer_id, 
          resolution, review_notes, evidence, metadata, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING ${this.columns.join(", ")}
      `;

      const params = [
        report.id,
        report.reporterId,
        report.contentId,
        report.contentType,
        report.contentOwnerId || null,
        report.type,
        report.description || null,
        report.status,
        report.severity,
        report.reviewerId || null,
        report.resolution || null,
        report.reviewNotes || null,
        evidenceJson,
        metadataJson,
        report.createdAt,
        report.updatedAt,
      ];

      const result = await this.executeQuery<ContentReportAttributes>(
        query,
        params,
      );
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error creating content report", error);
      throw new ContentReportError(
        `Failed to create content report: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update an existing content report
   * @param report The report with updated values
   * @returns The updated report
   * @throws ContentReportNotFoundError if the report doesn't exist
   */
  async updateReport(report: ContentReport): Promise<ContentReport> {
    try {
      // Validate the report before updating
      report.validate();

      // Check if report exists
      const existingReport = await this.findById(report.id);
      if (!existingReport) {
        throw new ContentReportNotFoundError(report.id);
      }

      const evidenceJson = report.evidence
        ? JSON.stringify(report.evidence)
        : null;
      const metadataJson = report.metadata
        ? JSON.stringify(report.metadata)
        : null;

      const query = `
        UPDATE ${this.tableName} SET
          reporter_id = $2,
          content_id = $3,
          content_type = $4,
          content_owner_id = $5,
          type = $6,
          description = $7,
          status = $8,
          severity = $9,
          reviewer_id = $10,
          resolution = $11,
          review_notes = $12,
          evidence = $13,
          metadata = $14,
          updated_at = $15
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const params = [
        report.id,
        report.reporterId,
        report.contentId,
        report.contentType,
        report.contentOwnerId || null,
        report.type,
        report.description || null,
        report.status,
        report.severity,
        report.reviewerId || null,
        report.resolution || null,
        report.reviewNotes || null,
        evidenceJson,
        metadataJson,
        new Date(),
      ];

      const result = await this.executeQuery<ContentReportAttributes>(
        query,
        params,
      );
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error updating content report", error);
      if (error instanceof ContentReportNotFoundError) {
        throw error;
      }
      throw new ContentReportError(
        `Failed to update content report: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find report by ID
   * @param id Report ID
   * @returns The report or null if not found
   */
  async findById(id: string): Promise<ContentReport | null> {
    try {
      const result = await this.findOneByField("id", id);
      if (!result) {
        return null;
      }

      return this.mapResultToModel(result);
    } catch (error) {
      this.logger.error(`Error finding content report by ID ${id}`, error);
      throw new ContentReportError(
        `Failed to find content report: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find reports by content ID and type
   * @param contentId ID of the reported content
   * @param contentType Type of the reported content
   * @param limit Maximum number of reports to return
   * @param offset Number of reports to skip for pagination
   * @returns List of reports
   */
  async findByContent(
    contentId: string,
    contentType: EntityType,
    limit = 20,
    offset = 0,
  ): Promise<ContentReport[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE content_id = $1 AND content_type = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await this.executeQuery<ContentReportAttributes>(query, [
        contentId,
        contentType,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(
        `Error finding content reports for content ${contentId} of type ${contentType}`,
        error,
      );
      throw new ContentReportError(
        `Failed to find reports for content: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find reports by reporter ID
   * @param reporterId User ID of the reporter
   * @param limit Maximum number of reports to return
   * @param offset Number of reports to skip for pagination
   * @returns List of reports
   */
  async findByReporterId(
    reporterId: string,
    limit = 20,
    offset = 0,
  ): Promise<ContentReport[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE reporter_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<ContentReportAttributes>(query, [
        reporterId,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(
        `Error finding content reports by reporter ID ${reporterId}`,
        error,
      );
      throw new ContentReportError(
        `Failed to find reports by reporter: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find reports by content owner ID
   * @param contentOwnerId User ID of the content owner
   * @param limit Maximum number of reports to return
   * @param offset Number of reports to skip for pagination
   * @returns List of reports
   */
  async findByContentOwnerId(
    contentOwnerId: string,
    limit = 20,
    offset = 0,
  ): Promise<ContentReport[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE content_owner_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<ContentReportAttributes>(query, [
        contentOwnerId,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(
        `Error finding content reports by content owner ID ${contentOwnerId}`,
        error,
      );
      throw new ContentReportError(
        `Failed to find reports by content owner: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find reports by status
   * @param status Report status to filter by
   * @param limit Maximum number of reports to return
   * @param offset Number of reports to skip for pagination
   * @returns List of reports
   */
  async findByStatus(
    status: ReportStatus,
    limit = 20,
    offset = 0,
  ): Promise<ContentReport[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<ContentReportAttributes>(query, [
        status,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(
        `Error finding content reports by status ${status}`,
        error,
      );
      throw new ContentReportError(
        `Failed to find reports by status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find reports by type
   * @param type Report type to filter by
   * @param limit Maximum number of reports to return
   * @param offset Number of reports to skip for pagination
   * @returns List of reports
   */
  async findByType(
    type: ReportType,
    limit = 20,
    offset = 0,
  ): Promise<ContentReport[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE type = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<ContentReportAttributes>(query, [
        type,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(`Error finding content reports by type ${type}`, error);
      throw new ContentReportError(
        `Failed to find reports by type: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find high-priority reports (HIGH or CRITICAL severity)
   * @param limit Maximum number of reports to return
   * @param offset Number of reports to skip for pagination
   * @returns List of high-priority reports
   */
  async findHighPriority(limit = 20, offset = 0): Promise<ContentReport[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName} 
        WHERE severity IN ($1, $2) AND status = $3
        ORDER BY 
          CASE 
            WHEN severity = $2 THEN 0 
            ELSE 1 
          END, 
          created_at ASC
        LIMIT $4 OFFSET $5
      `;

      const params = [
        ReportSeverity.HIGH,
        ReportSeverity.CRITICAL,
        ReportStatus.PENDING,
        limit,
        offset,
      ];

      const result = await this.executeQuery<ContentReportAttributes>(
        query,
        params,
      );
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding high-priority content reports", error);
      throw new ContentReportError(
        `Failed to find high-priority reports: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Assign a report to a reviewer
   * @param reportId Report ID
   * @param reviewerId User ID of the reviewer
   * @returns The updated report
   */
  async assignToReviewer(
    reportId: string,
    reviewerId: string,
  ): Promise<ContentReport> {
    return this.withTransaction(async () => {
      try {
        const report = await this.findById(reportId);
        if (!report) {
          throw new ContentReportNotFoundError(reportId);
        }

        report.startReview(reviewerId);
        return await this.updateReport(report);
      } catch (error) {
        this.logger.error(
          `Error assigning report ${reportId} to reviewer ${reviewerId}`,
          error,
        );
        if (error instanceof ContentReportNotFoundError) {
          throw error;
        }
        throw new ContentReportError(
          `Failed to assign report to reviewer: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Update report status to RESOLVED
   * @param reportId Report ID
   * @param resolution Resolution description
   * @returns The updated report
   */
  async resolveReport(
    reportId: string,
    resolution: string,
  ): Promise<ContentReport> {
    return this.withTransaction(async () => {
      try {
        const report = await this.findById(reportId);
        if (!report) {
          throw new ContentReportNotFoundError(reportId);
        }

        report.resolve(resolution);
        return await this.updateReport(report);
      } catch (error) {
        this.logger.error(`Error resolving report ${reportId}`, error);
        if (error instanceof ContentReportNotFoundError) {
          throw error;
        }
        throw new ContentReportError(
          `Failed to resolve report: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Update report status to DISMISSED
   * @param reportId Report ID
   * @param reason Reason for dismissal
   * @returns The updated report
   */
  async dismissReport(
    reportId: string,
    reason: string,
  ): Promise<ContentReport> {
    return this.withTransaction(async () => {
      try {
        const report = await this.findById(reportId);
        if (!report) {
          throw new ContentReportNotFoundError(reportId);
        }

        report.dismiss(reason);
        return await this.updateReport(report);
      } catch (error) {
        this.logger.error(`Error dismissing report ${reportId}`, error);
        if (error instanceof ContentReportNotFoundError) {
          throw error;
        }
        throw new ContentReportError(
          `Failed to dismiss report: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Add review notes to a report
   * @param reportId Report ID
   * @param notes Review notes
   * @returns The updated report
   */
  async addReviewNotes(
    reportId: string,
    notes: string,
  ): Promise<ContentReport> {
    try {
      const report = await this.findById(reportId);
      if (!report) {
        throw new ContentReportNotFoundError(reportId);
      }

      report.addReviewNotes(notes);
      return await this.updateReport(report);
    } catch (error) {
      this.logger.error(
        `Error adding review notes to report ${reportId}`,
        error,
      );
      if (error instanceof ContentReportNotFoundError) {
        throw error;
      }
      throw new ContentReportError(
        `Failed to add review notes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Set report severity
   * @param reportId Report ID
   * @param severity The new severity level
   * @returns The updated report
   */
  async setSeverity(
    reportId: string,
    severity: ReportSeverity,
  ): Promise<ContentReport> {
    try {
      const report = await this.findById(reportId);
      if (!report) {
        throw new ContentReportNotFoundError(reportId);
      }

      report.setSeverity(severity);
      return await this.updateReport(report);
    } catch (error) {
      this.logger.error(`Error setting severity for report ${reportId}`, error);
      if (error instanceof ContentReportNotFoundError) {
        throw error;
      }
      throw new ContentReportError(
        `Failed to set report severity: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Add evidence to a report
   * @param reportId Report ID
   * @param evidenceUrl URL or reference to evidence
   * @returns The updated report
   */
  async addEvidence(
    reportId: string,
    evidenceUrl: string,
  ): Promise<ContentReport> {
    try {
      const report = await this.findById(reportId);
      if (!report) {
        throw new ContentReportNotFoundError(reportId);
      }

      report.addEvidence(evidenceUrl);
      return await this.updateReport(report);
    } catch (error) {
      this.logger.error(`Error adding evidence to report ${reportId}`, error);
      if (error instanceof ContentReportNotFoundError) {
        throw error;
      }
      throw new ContentReportError(
        `Failed to add evidence: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get report statistics
   * @returns Object containing report statistics
   */
  async getReportStatistics(): Promise<{
    total: number;
    pending: number;
    inReview: number;
    resolved: number;
    dismissed: number;
    byType: Record<ReportType, number>;
    bySeverity: Record<ReportSeverity, number>;
  }> {
    try {
      // Get counts by status
      const statusQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = $1 THEN 1 END) as pending,
          COUNT(CASE WHEN status = $2 THEN 1 END) as in_review,
          COUNT(CASE WHEN status = $3 THEN 1 END) as resolved,
          COUNT(CASE WHEN status = $4 THEN 1 END) as dismissed
        FROM ${this.tableName}
      `;

      const statusParams = [
        ReportStatus.PENDING,
        ReportStatus.IN_REVIEW,
        ReportStatus.RESOLVED,
        ReportStatus.DISMISSED,
      ];

      interface StatusResult extends Record<string, unknown> {
        total: string;
        pending: string;
        in_review: string;
        resolved: string;
        dismissed: string;
      }

      const statusResult = await this.executeQuery<StatusResult>(
        statusQuery,
        statusParams,
      );

      // Get counts by type
      const typeQuery = `
        SELECT type, COUNT(*) as count
        FROM ${this.tableName}
        GROUP BY type
      `;

      const typeResult = await this.executeQuery<{
        type: ReportType;
        count: string;
      }>(typeQuery);

      // Get counts by severity
      const severityQuery = `
        SELECT severity, COUNT(*) as count
        FROM ${this.tableName}
        GROUP BY severity
      `;

      const severityResult = await this.executeQuery<{
        severity: ReportSeverity;
        count: string;
      }>(severityQuery);

      // Process results
      const byType: Record<ReportType, number> = {} as Record<
        ReportType,
        number
      >;
      Object.values(ReportType).forEach((type) => {
        byType[type] = 0;
      });

      typeResult.rows.forEach((row) => {
        byType[row.type] = parseInt(row.count);
      });

      const bySeverity: Record<ReportSeverity, number> = {} as Record<
        ReportSeverity,
        number
      >;
      Object.values(ReportSeverity).forEach((severity) => {
        bySeverity[severity] = 0;
      });

      severityResult.rows.forEach((row) => {
        bySeverity[row.severity] = parseInt(row.count);
      });

      const stats = statusResult.rows[0];

      return {
        total: parseInt(stats.total) || 0,
        pending: parseInt(stats.pending) || 0,
        inReview: parseInt(stats.in_review) || 0,
        resolved: parseInt(stats.resolved) || 0,
        dismissed: parseInt(stats.dismissed) || 0,
        byType,
        bySeverity,
      };
    } catch (error) {
      this.logger.error("Error getting report statistics", error);
      throw new ContentReportError(
        `Failed to get report statistics: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Map database result to ContentReport model
   * @param row Database result row
   * @returns ContentReport model
   */
  protected mapResultToModel(row: Record<string, unknown>): ContentReport {
    if (!row) return null as unknown as ContentReport;

    let evidence: string[] = [];
    try {
      if (typeof row.evidence === "string") {
        evidence = JSON.parse(row.evidence) as string[];
      } else if (Array.isArray(row.evidence)) {
        evidence = row.evidence.map(String);
      }
    } catch (error) {
      this.logger.error("Error parsing evidence JSON", error);
      evidence = [];
    }

    let metadata: Record<string, unknown> | null = null;
    try {
      if (typeof row.metadata === "string") {
        metadata = JSON.parse(row.metadata) as Record<string, unknown>;
      } else if (row.metadata && typeof row.metadata === "object") {
        metadata = row.metadata as Record<string, unknown>;
      }
    } catch (error) {
      this.logger.error("Error parsing metadata JSON", error);
      metadata = null;
    }

    const report = new ContentReport({
      reporterId: String(row.reporterId || row.reporter_id),
      contentId: String(row.contentId || row.content_id),
      contentType: (row.contentType || row.content_type) as EntityType,
      type: row.type as ReportType,
      contentOwnerId:
        row.contentOwnerId || row.content_owner_id
          ? String(row.contentOwnerId || row.content_owner_id)
          : undefined,
      description: row.description ? String(row.description) : undefined,
      status: row.status as ReportStatus,
      severity: row.severity as ReportSeverity,
      reviewerId:
        row.reviewerId || row.reviewer_id
          ? String(row.reviewerId || row.reviewer_id)
          : undefined,
      resolution: row.resolution ? String(row.resolution) : undefined,
      reviewNotes:
        row.reviewNotes || row.review_notes
          ? String(row.reviewNotes || row.review_notes)
          : undefined,
      evidence,
      metadata,
    });

    report.id = String(row.id);
    report.createdAt = new Date(String(row.createdAt || row.created_at));
    report.updatedAt = new Date(String(row.updatedAt || row.updated_at));

    return report;
  }
}

// Export a singleton instance
export const contentReportRepository = ContentReportRepository.getInstance();
