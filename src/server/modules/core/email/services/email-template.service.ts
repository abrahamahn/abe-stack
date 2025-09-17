import * as fs from "fs/promises";
import * as path from "path";

import { IDatabaseServer } from "@infrastructure/database";
import { ILoggerService } from "@infrastructure/logging";

import { BaseService } from "../../../base/baseService";

/**
 * Interface for template data
 */
export interface TemplateData {
  [key: string]: any;
}

/**
 * Email template service for managing and rendering email templates
 */
export class EmailTemplateService extends BaseService {
  /**
   * Path to the templates directory
   */
  private templateDir: string;

  /**
   * Template cache
   */
  private templateCache: Map<string, string>;

  /**
   * Logger tag
   */
  private readonly LOG_TAG = "EmailTemplateService";

  /**
   * Constructor
   * @param templateDir - Path to the templates directory (optional)
   * @param logger - Logger service (optional)
   * @param databaseService - Database service (optional)
   */
  constructor(
    templateDir?: string,
    logger?: ILoggerService,
    databaseService?: IDatabaseServer
  ) {
    super(
      logger || ({} as ILoggerService),
      databaseService || ({} as IDatabaseServer)
    );
    this.templateDir =
      templateDir || path.join(process.cwd(), "templates", "email");
    this.templateCache = new Map<string, string>();
  }

  /**
   * Set the template directory
   * @param dir - Path to the template directory
   */
  setTemplateDir(dir: string): void {
    this.templateDir = dir;
    this.templateCache.clear(); // Clear cache when changing directory
  }

  /**
   * Load a template from file
   * @param templateName - Name of the template
   */
  async loadTemplate(templateName: string): Promise<string> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName) as string;
    }

    try {
      // Construct path to template file
      const templatePath = path.join(this.templateDir, `${templateName}.html`);

      // Read template file
      const templateContent = await fs.readFile(templatePath, "utf-8");

      // Cache template
      this.templateCache.set(templateName, templateContent);

      return templateContent;
    } catch (error) {
      console.error(`[${this.LOG_TAG}] Error loading template:`, error);
      throw new Error(
        `Failed to load template "${templateName}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Register a template by name with its content
   * @param templateName - Name of the template
   * @param content - Template content
   */
  registerTemplate(templateName: string, content: string): void {
    this.templateCache.set(templateName, content);
  }

  /**
   * Clear the template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Simple template rendering function
   * @param template - Template string
   * @param data - Data for template variables
   */
  private renderTemplate(template: string, data: TemplateData): string {
    // Simple placeholder replacement
    // In a real implementation, you would use a more robust template engine
    return template.replace(/\{{2}\s*([^{}]+)\s*\}{2}/g, (match, key) => {
      const trimmedKey = key.trim();
      const value = this.getValueByPath(data, trimmedKey);
      return value !== undefined ? String(value) : "";
    });
  }

  /**
   * Get a nested value from an object using dot notation
   * @param obj - Object to get value from
   * @param path - Path to the value (e.g. 'user.name')
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split(".").reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : undefined;
    }, obj);
  }

  /**
   * Render a template with data
   * @param templateName - Name of the template
   * @param data - Data for the template
   */
  async render(templateName: string, data: TemplateData): Promise<string> {
    try {
      // Load template
      const template = await this.loadTemplate(templateName);

      // Render template with data
      return this.renderTemplate(template, data);
    } catch (error) {
      console.error(`[${this.LOG_TAG}] Error rendering template:`, error);
      throw new Error(
        `Failed to render template "${templateName}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
