import { Request, Response, NextFunction } from "express";

/**
 * Options for RBAC middleware
 */
export interface RbacOptions {
  /** Custom error message to return */
  customMessage?: string;
  /** HTTP status code to return on failure (defaults to 403 Forbidden) */
  statusCode?: number;
  /** Error response structure */
  errorResponse?: (message: string) => any;
  /** Mode of operation (default: "strict") */
  mode?: "strict" | "advisory";
  /** Function to get resource data */
  getResourceData?: (req: Request) => any;
  /** Forbidden handler function */
  forbiddenHandler?: (req: Request, res: Response, message: string) => void;
  /** Error handler function */
  errorHandler?: (req: Request, res: Response, error: Error) => void;
}

/**
 * Default RBAC options
 */
export const DEFAULT_RBAC_OPTIONS: RbacOptions = {
  statusCode: 403,
  errorResponse: (message: string) => ({
    error: message,
    status: 403,
    timestamp: new Date().toISOString(),
  }),
  mode: "strict",
};

/**
 * Check if the user has the specified role
 *
 * @param role The role to check for
 * @param options Configuration options
 * @returns Express middleware function
 */
export function hasRole(
  role: string,
  options: RbacOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...DEFAULT_RBAC_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if user exists on the request
    if (!req.user) {
      const message = "Unauthorized: Authentication required";
      res
        .status(401)
        .json(
          opts.errorResponse ? opts.errorResponse(message) : { error: message }
        );
      return;
    }

    // Check if user has the required role
    if (req.user.roles && req.user.roles.includes(role)) {
      next();
      return;
    }

    // User doesn't have the required role
    const message =
      opts.customMessage || `Forbidden: Required role '${role}' not found`;
    res
      .status(opts.statusCode || 403)
      .json(
        opts.errorResponse ? opts.errorResponse(message) : { error: message }
      );
  };
}

/**
 * Check if the user has any of the specified roles
 *
 * @param roles Array of roles to check for
 * @param options Configuration options
 * @returns Express middleware function
 */
export function hasAnyRole(
  roles: string[],
  options: RbacOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...DEFAULT_RBAC_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if user exists on the request
    if (!req.user) {
      const message = "Unauthorized: Authentication required";
      res
        .status(401)
        .json(
          opts.errorResponse ? opts.errorResponse(message) : { error: message }
        );
      return;
    }

    // Check if user has any of the required roles
    if (req.user.roles && roles.some((role) => req.user.roles.includes(role))) {
      next();
      return;
    }

    // User doesn't have any required role
    const roleList = roles.map((r) => `'${r}'`).join(", ");
    const message =
      opts.customMessage ||
      `Forbidden: User lacks any required role (${roleList})`;
    res
      .status(opts.statusCode || 403)
      .json(
        opts.errorResponse ? opts.errorResponse(message) : { error: message }
      );
  };
}

/**
 * Check if the user has all of the specified roles
 *
 * @param roles Array of roles to check for
 * @param options Configuration options
 * @returns Express middleware function
 */
export function hasAllRoles(
  roles: string[],
  options: RbacOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...DEFAULT_RBAC_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if user exists on the request
    if (!req.user) {
      const message = "Unauthorized: Authentication required";
      res
        .status(401)
        .json(
          opts.errorResponse ? opts.errorResponse(message) : { error: message }
        );
      return;
    }

    // Check if user has all of the required roles
    if (
      req.user.roles &&
      roles.every((role) => req.user.roles.includes(role))
    ) {
      next();
      return;
    }

    // User doesn't have all required roles
    const roleList = roles.map((r) => `'${r}'`).join(", ");
    const message =
      opts.customMessage ||
      `Forbidden: User lacks all required roles (${roleList})`;
    res
      .status(opts.statusCode || 403)
      .json(
        opts.errorResponse ? opts.errorResponse(message) : { error: message }
      );
  };
}

/**
 * Create a complex role-based access control middleware
 *
 * @param conditionFn Function that determines if access is granted
 * @param options Configuration options
 * @returns Express middleware function
 */
export function createRbacMiddleware(
  conditionFn: (user: Express.User) => boolean,
  options: RbacOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...DEFAULT_RBAC_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if user exists on the request
    if (!req.user) {
      const message = "Unauthorized: Authentication required";
      res
        .status(401)
        .json(
          opts.errorResponse ? opts.errorResponse(message) : { error: message }
        );
      return;
    }

    // Check if user passes the condition function
    if (conditionFn(req.user)) {
      next();
      return;
    }

    // User doesn't pass the condition
    const message =
      opts.customMessage || `Forbidden: Access denied by custom RBAC rule`;
    res
      .status(opts.statusCode || 403)
      .json(
        opts.errorResponse ? opts.errorResponse(message) : { error: message }
      );
  };
}

/**
 * Middleware to check if the user has the required permission
 */
export function requirePermission(
  permission: string,
  options: RbacOptions = DEFAULT_RBAC_OPTIONS
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        if (options.mode === "advisory") {
          console.log(`[RBAC Advisory] Unauthenticated access to ${req.path}`);
          return next();
        }
        return options.forbiddenHandler
          ? options.forbiddenHandler(req, res, "Authentication required")
          : res.status(401).json({ error: "Authentication required" });
      }

      // Create a custom context with resource data
      const context = {
        user: req.user,
        resource: options.getResourceData ? options.getResourceData(req) : {},
      };

      // In a real implementation, this would check the permission against the user's permissions
      // For now, we'll just check if the user has the 'admin' role
      if (req.user.roles && req.user.roles.includes("admin")) {
        return next();
      }

      if (options.mode === "advisory") {
        console.log(
          `[RBAC Advisory] Permission '${permission}' denied for user ${req.user.id}`
        );
        return next();
      }

      return options.forbiddenHandler
        ? options.forbiddenHandler(
            req,
            res,
            `Permission '${permission}' denied`
          )
        : res.status(403).json({ error: `Permission '${permission}' denied` });
    } catch (error) {
      return options.errorHandler
        ? options.errorHandler(req, res, error as Error)
        : res.status(500).json({ error: "Error checking permissions" });
    }
  };
}

/**
 * Middleware to check if the user has the required role
 */
export function requireRole(
  role: string,
  options: RbacOptions = DEFAULT_RBAC_OPTIONS
) {
  return hasRole(role, options);
}
