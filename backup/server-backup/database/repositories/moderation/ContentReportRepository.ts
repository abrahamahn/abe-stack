import crypto from "crypto";

import {
  ContentReport,
  ContentReportAttributes,
  ReportSeverity,
  ReportStatus,
  ReportType,
} from "@/server/database/models/moderation/ContentReport";
import { EntityType } from "@/server/database/models/shared/EntityTypes";
import {
  ReportError,
  ReportNotFoundError,
  ReportValidationError,
  ReportOperationError,
  InvalidReportStatusTransitionError,
} from "@/server/infrastructure/errors/domain/moderation/ReportError";

import { BaseRepository } from "../BaseRepository";

export class ContentReportRepository extends BaseRepository<ContentReportAttributes> {
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

  constructor() {
    super("ContentReport");
  }

  /**
   * Create a new content report
   * @param report The report to create
   * @returns The created report
   * @throws {ReportValidationError} If validation fails
   * @throws {ReportOperationError} If an error occurs during the operation
   */
  async create(report: ContentReport): Promise<ContentReport> {
    try {
      // Validate the report before saving
      const validationErrors = report.validate();
      if (validationErrors.length > 0) {
        throw new ReportValidationError(validationErrors);
      }

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
        params
      );
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (error instanceof ReportValidationError) {
        throw error;
      }
      throw new ReportOperationError("create", error);
    }
  }

  /**
   * Update an existing content report
   * @param report The report with updated values
   * @returns The updated report
   * @throws {ReportNotFoundError} If the report doesn't exist
   * @throws {ReportValidationError} If validation fails
   * @throws {ReportOperationError} If an error occurs during the operation
   */
  async updateReport(report: ContentReport): Promise<ContentReport> {
    try {
      // Validate the report before updating
      const validationErrors = report.validate();
      if (validationErrors.length > 0) {
        throw new ReportValidationError(validationErrors);
      }

      // Check if report exists
      const existingReport = await this.findById(report.id);
      if (!existingReport) {
        throw new ReportNotFoundError(report.id);
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
        params
      );
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (
        error instanceof ReportNotFoundError ||
        error instanceof ReportValidationError
      ) {
        throw error;
      }
      throw new ReportOperationError("updateReport", error);
    }
  }

  /**
   * Find report by ID
   * @param id Report ID
   * @returns The report or null if not found
   * @throws {ReportOperationError} If an error occurs during the operation
   */
  async findById(id: string): Promise<ContentReport | null> {
    try {
      const result = await this.findOneByField("id", id);
      if (!result) {
        return null;
      }
      return this.mapResultToModel(result);
    } catch (error) {
      throw new ReportOperationError("findById", error);
    }
  }

  /**
   * Find report by ID or throw error if not found
   * @param id Report ID
   * @returns The report
   * @throws {ReportNotFoundError} If the report is not found
   * @throws {ReportOperationError} If an error occurs during the operation
   */
  async findByIdOrThrow(id: string): Promise<ContentReport> {
    const report = await this.findById(id);
    if (!report) {
      throw new ReportNotFoundError(id);
    }
    return report;
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
    offset = 0
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
      throw new ReportError(
        `Failed to find reports for content: ${error instanceof Error ? error.message : String(error)}`
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
    offset = 0
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
      throw new ReportError(
        `Failed to find reports by reporter: ${error instanceof Error ? error.message : String(error)}`
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
    offset = 0
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
      throw new ReportError(
        `Failed to find reports by content owner: ${error instanceof Error ? error.message : String(error)}`
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
    offset = 0
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
      throw new ReportError(
        `Failed to find reports by status: ${error instanceof Error ? error.message : String(error)}`
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
    offset = 0
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
      throw new ReportError(
        `Failed to find reports by type: ${error instanceof Error ? error.message : String(error)}`
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
        params
      );
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new ReportError(
        `Failed to find high-priority reports: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Assign a report to a reviewer
   * @param reportId Report ID
   * @param reviewerId User ID of the reviewer
   * @returns Updated report
   * @throws {ReportNotFoundError} If the report doesn't exist
   * @throws {InvalidReportStatusTransitionError} If the report status doesn't allow assignment
   * @throws {ReportOperationError} If an error occurs during the operation
   */
  async assignToReviewer(
    reportId: string,
    reviewerId: string
  ): Promise<ContentReport> {
    try {
      const report = await this.findById(reportId);
      if (!report) {
        throw new ReportNotFoundError(reportId);
      }

      // Check if the report can be assigned to a reviewer
      if (report.status !== ReportStatus.PENDING) {
        throw new InvalidReportStatusTransitionError(
          reportId,
          report.status,
          ReportStatus.IN_REVIEW
        );
      }

      // Update the report
      report.reviewerId = reviewerId;
      report.status = ReportStatus.IN_REVIEW;
      report.updatedAt = new Date();

      return this.updateReport(report);
    } catch (error) {
      if (
        error instanceof ReportNotFoundError ||
        error instanceof InvalidReportStatusTransitionError
      ) {
        throw error;
      }
      throw new ReportOperationError("assignToReviewer", error);
    }
  }

  /**
   * Update report status to RESOLVED
   * @param reportId Report ID
   * @param resolution Resolution description
   * @returns The updated report
   */
  async resolveReport(
    reportId: string,
    resolution: string
  ): Promise<ContentReport> {
    return this.withTransaction(async () => {
      try {
        const report = await this.findById(reportId);
        if (!report) {
          throw new ReportNotFoundError(reportId);
        }

        report.resolve(resolution);
        return await this.updateReport(report);
      } catch (error) {
        if (error instanceof ReportNotFoundError) {
          throw error;
        }
        throw new ReportOperationError("resolveReport", error);
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
    reason: string
  ): Promise<ContentReport> {
    return this.withTransaction(async () => {
      try {
        const report = await this.findById(reportId);
        if (!report) {
          throw new ReportNotFoundError(reportId);
        }

        report.dismiss(reason);
        return await this.updateReport(report);
      } catch (error) {
        if (error instanceof ReportNotFoundError) {
          throw error;
        }
        throw new ReportOperationError("dismissReport", error);
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
    notes: string
  ): Promise<ContentReport> {
    try {
      const report = await this.findById(reportId);
      if (!report) {
        throw new ReportNotFoundError(reportId);
      }

      report.addReviewNotes(notes);
      return await this.updateReport(report);
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        throw error;
      }
      throw new ReportOperationError("addReviewNotes", error);
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
    severity: ReportSeverity
  ): Promise<ContentReport> {
    try {
      const report = await this.findById(reportId);
      if (!report) {
        throw new ReportNotFoundError(reportId);
      }

      report.setSeverity(severity);
      return await this.updateReport(report);
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        throw error;
      }
      throw new ReportOperationError("setSeverity", error);
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
    evidenceUrl: string
  ): Promise<ContentReport> {
    try {
      const report = await this.findById(reportId);
      if (!report) {
        throw new ReportNotFoundError(reportId);
      }

      report.addEvidence(evidenceUrl);
      return await this.updateReport(report);
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        throw error;
      }
      throw new ReportOperationError("addEvidence", error);
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
        statusParams
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
      throw new ReportError(
        `Failed to get report statistics: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Maps a database row to a ContentReport model
   * @param row Database result row
   * @returns ContentReport instance
   */
  protected mapResultToModel(row: Record<string, unknown>): ContentReport {
    if (!row) return null as unknown as ContentReport;

    // Parse JSON fields
    const evidence = row.evidence
      ? JSON.parse(row.evidence as string)
      : undefined;
    const metadata = row.metadata
      ? JSON.parse(row.metadata as string)
      : undefined;

    return new ContentReport({
      ...row,
      evidence,
      metadata,
    } as ContentReportAttributes);
  }
}

// Export singleton instance
export const contentReportRepository = new ContentReportRepository();
