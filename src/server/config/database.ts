import { Pool } from 'pg';
import { envConfig } from './environment';

export const db = new Pool({
  user: envConfig.DB_USER,
  password: envConfig.DB_PASSWORD,
  host: envConfig.DB_HOST,
  port: envConfig.DB_PORT,
  database: envConfig.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
}); 