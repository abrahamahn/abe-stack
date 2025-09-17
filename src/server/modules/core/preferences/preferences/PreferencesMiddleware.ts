import { Request, Response, NextFunction } from "express";

import { UserPreferenceService } from "@/server/modules/preferences";

/**
 * Options for the preferences middleware
 */
export interface PreferencesMiddlewareOptions {
  /**
   * Whether to attach preferences to the request
   */
  attachToRequest?: boolean;

  /**
   * Custom error handler
   */
  errorHandler?: (req: Request, res: Response, error: Error) => void;
}

/**
 * Default options for the preferences middleware
 */
export const DEFAULT_OPTIONS: PreferencesMiddlewareOptions = {
  attachToRequest: true,
};

// Add preferences property to Express Request interface
declare global {
  namespace Express {
    interface Request {
      preferences?: {
        /**
         * Get a preference value
         * @param key - Preference key
         * @param defaultValue - Default value if preference not found
         */
        get: <T>(
          key: string,
          defaultValue?: T
        ) => Promise<T | null | undefined>;

        /**
         * Set a preference value
         * @param key - Preference key
         * @param value - Preference value
         */
        set: (key: string, value: any) => Promise<void>;

        /**
         * Check if a preference exists
         * @param key - Preference key
         */
        has: (key: string) => Promise<boolean>;

        /**
         * Delete a preference
         * @param key - Preference key
         */
        delete: (key: string) => Promise<boolean>;

        /**
         * Get all preferences
         */
        getAll: () => Promise<Record<string, any>>;
      };
    }
  }
}

/**
 * Middleware for handling user preferences
 * @param preferenceService - User preference service
 * @param options - Middleware options
 */
export const preferencesMiddleware = (
  preferenceService: UserPreferenceService,
  options: PreferencesMiddlewareOptions = DEFAULT_OPTIONS
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip if no authenticated user
      if (!req.user || !req.user.id) {
        return next();
      }

      if (options.attachToRequest) {
        // Attach preferences helper to the request
        req.preferences = {
          get: async <T>(key: string, defaultValue?: T) => {
            return preferenceService.getValue<T>(
              req.user!.id,
              key,
              defaultValue
            );
          },

          set: async (key: string, value: any) => {
            await preferenceService.setPreference(req.user!.id, key, value);
          },

          has: async (key: string) => {
            return preferenceService.hasPreference(req.user!.id, key);
          },

          delete: async (key: string) => {
            return preferenceService.deletePreference(req.user!.id, key);
          },

          getAll: async () => {
            const prefs = await preferenceService.getUserPreferences(
              req.user!.id
            );
            const result: Record<string, any> = {};

            for (const pref of prefs) {
              result[pref.key] = pref.value;
            }

            return result;
          },
        };
      }

      next();
    } catch (error) {
      if (options.errorHandler) {
        options.errorHandler(req, res, error as Error);
      } else {
        next(error);
      }
    }
  };
};
