import {
  ValidationError,
  ResourceNotFoundError,
  UnauthorizedError,
} from "./ServiceError";

export class PostValidationError extends ValidationError {
  constructor(message: string) {
    super(message);
    this.name = "PostValidationError";
  }
}

export class PostNotFoundError extends ResourceNotFoundError {
  constructor(postId: string) {
    super(`Post with ID ${postId} not found`);
    this.name = "PostNotFoundError";
  }
}

export class PostPermissionError extends UnauthorizedError {
  constructor(message: string) {
    super(message);
    this.name = "PostPermissionError";
  }
}

export class PostRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostRateLimitError";
  }
}

export class PostContentError extends ValidationError {
  constructor(message: string) {
    super(message);
    this.name = "PostContentError";
  }
}

export class PostSchedulingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostSchedulingError";
  }
}
