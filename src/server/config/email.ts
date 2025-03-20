import { parseEnv } from "./environment";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export const emailConfig: EmailConfig = {
  host: parseEnv("SMTP_HOST", "smtp.example.com"),
  port: parseEnv("SMTP_PORT", 587, (v: string) => parseInt(v, 10)),
  secure: parseEnv("SMTP_SECURE", false, (v: string) => v === "true"),
  auth: {
    user: parseEnv("SMTP_USER", ""),
    pass: parseEnv("SMTP_PASS", ""),
  },
  from: parseEnv("SMTP_FROM", "noreply@example.com"),
};
