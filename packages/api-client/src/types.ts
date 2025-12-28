import { loginRequestSchema, loginResponseSchema } from "@abe-stack/shared";
import { z } from "zod";

// Example shapes pulled from shared contracts; expand as APIs are added.
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export interface ApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}
