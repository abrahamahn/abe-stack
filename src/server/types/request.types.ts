import { Request } from 'express';

/**
 * Interface for authenticated requests with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
    [key: string]: unknown;
  };
  token?: string;
}

/**
 * Interface for authenticated requests with user ID param
 */
export interface UserParamRequest extends AuthenticatedRequest {
  params: {
    userId: string;
    [key: string]: string;
  };
}

/**
 * Interface for authenticated requests with post ID param
 */
export interface PostParamRequest extends AuthenticatedRequest {
  params: {
    postId: string;
    [key: string]: string;
  };
}

/**
 * Interface for authenticated requests with comment ID param
 */
export interface CommentParamRequest extends AuthenticatedRequest {
  params: {
    commentId: string;
    [key: string]: string;
  };
}

/**
 * Interface for requests with file uploads
 */
export interface FileUploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
  files?: {
    [fieldname: string]: Express.Multer.File[];
  };
} 