import { PostContentError } from "@/server/services/shared/errors/PostErrors";
import { profanityFilter } from "@/server/services/shared/security/ProfanityFilter";
import { urlValidator } from "@/server/services/shared/validation/UrlValidator";

interface ContentLimits {
  maxTextLength: number;
  maxCaptionLength: number;
  maxPollOptions: number;
  minPollOptions: number;
  maxPollOptionLength: number;
  maxHashtags: number;
  maxMentions: number;
  maxUrls: number;
}

export class ContentValidator {
  private readonly limits: ContentLimits = {
    maxTextLength: 5000,
    maxCaptionLength: 1000,
    maxPollOptions: 4,
    minPollOptions: 2,
    maxPollOptionLength: 100,
    maxHashtags: 30,
    maxMentions: 50,
    maxUrls: 5,
  };

  private readonly urlRegex =
    /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
  private readonly hashtagRegex = /^[a-zA-Z0-9_]+$/;
  private readonly mentionRegex = /^[a-zA-Z0-9_]+$/;

  public async isValidText(text: string): Promise<boolean> {
    if (!text || typeof text !== "string") {
      throw new PostContentError("Text content must be a non-empty string");
    }

    if (text.length > this.limits.maxTextLength) {
      throw new PostContentError(
        `Text content cannot exceed ${this.limits.maxTextLength} characters`
      );
    }

    if (await this.containsProfanity(text)) {
      throw new PostContentError("Content contains inappropriate language");
    }

    return true;
  }

  public async isValidCaption(caption: string): Promise<boolean> {
    if (!caption || typeof caption !== "string") {
      throw new PostContentError("Caption must be a non-empty string");
    }

    if (caption.length > this.limits.maxCaptionLength) {
      throw new PostContentError(
        `Caption cannot exceed ${this.limits.maxCaptionLength} characters`
      );
    }

    if (await this.containsProfanity(caption)) {
      throw new PostContentError("Caption contains inappropriate language");
    }

    return true;
  }

  public isValidUrl(url: string): boolean {
    if (!url || typeof url !== "string") {
      throw new PostContentError("URL must be a non-empty string");
    }

    if (!this.urlRegex.test(url)) {
      throw new PostContentError("Invalid URL format");
    }

    return urlValidator.isValid(url);
  }

  public isValidPoll(question: string, options: string[]): boolean {
    if (!question || typeof question !== "string") {
      throw new PostContentError("Poll question must be a non-empty string");
    }

    if (question.length > this.limits.maxCaptionLength) {
      throw new PostContentError(
        `Poll question cannot exceed ${this.limits.maxCaptionLength} characters`
      );
    }

    if (!Array.isArray(options)) {
      throw new PostContentError("Poll options must be an array");
    }

    if (options.length < this.limits.minPollOptions) {
      throw new PostContentError(
        `Poll must have at least ${this.limits.minPollOptions} options`
      );
    }

    if (options.length > this.limits.maxPollOptions) {
      throw new PostContentError(
        `Poll cannot have more than ${this.limits.maxPollOptions} options`
      );
    }

    options.forEach((option, index) => {
      if (!option || typeof option !== "string") {
        throw new PostContentError(
          `Poll option ${index + 1} must be a non-empty string`
        );
      }

      if (option.length > this.limits.maxPollOptionLength) {
        throw new PostContentError(
          `Poll option ${index + 1} cannot exceed ${this.limits.maxPollOptionLength} characters`
        );
      }
    });

    return true;
  }

  public isValidHashtags(hashtags: string[]): boolean {
    if (!Array.isArray(hashtags)) {
      throw new PostContentError("Hashtags must be an array");
    }

    if (hashtags.length > this.limits.maxHashtags) {
      throw new PostContentError(
        `Cannot include more than ${this.limits.maxHashtags} hashtags`
      );
    }

    hashtags.forEach((hashtag) => {
      if (!hashtag || typeof hashtag !== "string") {
        throw new PostContentError("Each hashtag must be a non-empty string");
      }

      if (!this.hashtagRegex.test(hashtag)) {
        throw new PostContentError(`Invalid hashtag format: ${hashtag}`);
      }
    });

    return true;
  }

  public isValidMentions(mentions: string[]): boolean {
    if (!Array.isArray(mentions)) {
      throw new PostContentError("Mentions must be an array");
    }

    if (mentions.length > this.limits.maxMentions) {
      throw new PostContentError(
        `Cannot include more than ${this.limits.maxMentions} mentions`
      );
    }

    mentions.forEach((mention) => {
      if (!mention || typeof mention !== "string") {
        throw new PostContentError("Each mention must be a non-empty string");
      }

      if (!this.mentionRegex.test(mention)) {
        throw new PostContentError(`Invalid mention format: ${mention}`);
      }
    });

    return true;
  }

  public async containsProfanity(text: string): Promise<boolean> {
    return profanityFilter.check(text);
  }

  public getLimits(): ContentLimits {
    return { ...this.limits };
  }
}
