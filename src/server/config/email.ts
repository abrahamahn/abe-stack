import { env } from './environment';

export const emailConfig = {
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: env.EMAIL_SECURE,
  user: env.EMAIL_USER,
  password: env.EMAIL_PASSWORD,
  appName: env.APP_NAME,
  appUrl: env.APP_URL,
  isDevelopment: env.NODE_ENV === 'development',
  serverPort: env.PORT
};

export default emailConfig; 