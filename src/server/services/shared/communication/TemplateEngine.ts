/**
 * Simple template engine for rendering text with variables
 */
export class TemplateEngine {
  /**
   * Render a template by replacing placeholders with values
   * @param template The template string with {placeholders}
   * @param variables Object containing values for placeholders
   */
  render(template: string, variables: Record<string, unknown>): string {
    return template.replace(/{(\w+)}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });
  }
}
