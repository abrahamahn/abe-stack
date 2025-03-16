// This file is auto-generated. Do not edit manually.
// It serves as an index for all API handlers

import { createValidator } from '../../shared/dataTypes';
import { ServerEnvironment } from '../services/ServerEnvironment';

// Example export format - add actual handlers as needed
export const example = {
  handler: (_environment: ServerEnvironment, _args: Record<string, never>) => {
    return { success: true };
  },
  input: createValidator((_value: unknown) => true, 'example')
}; 