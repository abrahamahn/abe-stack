class UrlValidator {
  private static instance: UrlValidator;
  private readonly maxUrlLength = 2048;
  private readonly urlRegex =
    /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

  private constructor() {}

  static getInstance(): UrlValidator {
    if (!UrlValidator.instance) {
      UrlValidator.instance = new UrlValidator();
    }
    return UrlValidator.instance;
  }

  isValid(url: string): boolean {
    if (!url || url.length > this.maxUrlLength) return false;
    return this.urlRegex.test(url);
  }
}

export const urlValidator = UrlValidator.getInstance();
