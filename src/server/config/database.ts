import { Pool } from 'pg';
import { env } from './environment';

export const db = new Pool({
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  database: env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
}); 