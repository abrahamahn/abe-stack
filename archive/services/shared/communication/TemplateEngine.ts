import fs from "fs/promises";
import path from "path";

import { injectable } from "inversify";

/**
 * Simple template engine for rendering text with variables
 */
@injectable()
export class TemplateEngine {
  /**
   * Render a template by replacing placeholders with values
   * @param template The template string with {{placeholders}}
   * @param variables Object containing values for placeholders
   */
  render(template: string, variables: Record<string, unknown>): string {
    return template.replace(/{{(\w+)}}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Load a template file from the filesystem
   * @param filePath Path to the template file
   */
  async loadTemplate(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (error) {
      throw new Error(`Failed to load template: ${filePath}`);
    }
  }

  /**
   * Load and render a template in one step
   * @param filePath Path to the template file
   * @param variables Variables to inject into the template
   */
  async renderTemplate(
    filePath: string,
    variables: Record<string, unknown>
  ): Promise<string> {
    const template = await this.loadTemplate(filePath);
    return this.render(template, variables);
  }

  /**
   * Load a template from a directory with fallback
   * @param directory Directory containing templates
   * @param templateName Name of the template without extension
   * @param format Format extension (html, txt)
   * @param fallback Fallback template if the requested one is not found
   */
  async loadTemplateWithFallback(
    directory: string,
    templateName: string,
    format: string,
    fallback: string
  ): Promise<string> {
    const filePath = path.join(directory, `${templateName}.${format}`);

    try {
      return await this.loadTemplate(filePath);
    } catch (error) {
      // If template not found, try the fallback
      const fallbackPath = path.join(directory, `${fallback}.${format}`);
      return await this.loadTemplate(fallbackPath);
    }
  }
}
