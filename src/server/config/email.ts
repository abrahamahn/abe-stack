import envConfig from './environment';

export const emailConfig = {
  host: envConfig.EMAIL_HOST,
  port: envConfig.EMAIL_PORT,
  secure: envConfig.EMAIL_SECURE,
  user: envConfig.EMAIL_USER,
  password: envConfig.EMAIL_PASSWORD,
  appName: envConfig.APP_NAME,
  appUrl: envConfig.APP_URL,
  isDevelopment: envConfig.NODE_ENV === 'development',
  port: envConfig.PORT
};

export default emailConfig; 