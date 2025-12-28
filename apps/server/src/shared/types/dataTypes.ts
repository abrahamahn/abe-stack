export * from "data-type-ts";

// Create a custom validator that properly handles return types
export const uuid = {
  validate: (value: unknown): string | { message: string } => {
    // First check if it's a string
    if (typeof value !== "string") {
      return { message: `${JSON.stringify(value)} is not a valid UUID.` };
    }

    // Then check if it matches the UUID pattern
    const isValid =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        value,
      );

    return isValid
      ? value // Return the value itself when valid
      : { message: `${JSON.stringify(value)} is not a valid UUID.` };
  },
  inspect: () => "UUID",
};

export const datetime = {
  validate: (value: unknown): string | { message: string } => {
    // First check if it's a string
    if (typeof value !== "string") {
      return {
        message: `${JSON.stringify(value)} is not a valid ISO 8601 datetime string.`,
      };
    }

    // More comprehensive validation for ISO 8601 date strings
    // Check format YYYY-MM-DDThh:mm:ss(.sss)Z
    try {
      // Check basic format
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value)) {
        return {
          message: `${JSON.stringify(value)} is not a valid ISO 8601 datetime string.`,
        };
      }

      // Parse the date to validate month, day, hours, etc.
      const date = new Date(value);

      // Check if date is invalid
      if (isNaN(date.getTime())) {
        return {
          message: `${JSON.stringify(value)} is not a valid ISO 8601 datetime string.`,
        };
      }

      // Match original string (without milliseconds) back to date to ensure validity
      const dateWithoutMs = value.replace(/\.\d+/, "");
      const normalizedDate = date.toISOString().replace(/\.\d+/, "");

      if (dateWithoutMs !== normalizedDate) {
        return {
          message: `${JSON.stringify(value)} is not a valid ISO 8601 datetime string.`,
        };
      }

      return value;
    } catch (_e) {
      return {
        message: `${JSON.stringify(value)} is not a valid ISO 8601 datetime string.`,
      };
    }
  },
  inspect: () => "Datetime",
};
