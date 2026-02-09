// src/tools/scripts/audit/check-smtp-env.ts
/**
 * SMTP Env Sanity Check
 *
 * Run with:
 *   ENV_FILE=.config/env/.env.local node --import tsx src/tools/scripts/audit/check-smtp-env.ts
 */

import { initEnv, loadServerEnv } from '@abe-stack/server-engine';

initEnv();
const env = loadServerEnv();

const passLength = (env.SMTP_PASS ?? '').length;

// Do not print SMTP_PASS itself.
console.log('SMTP_HOST=', env.SMTP_HOST ?? '');
console.log('SMTP_PORT=', env.SMTP_PORT ?? '');
console.log('SMTP_SECURE=', env.SMTP_SECURE ?? '');
console.log('SMTP_USER=', env.SMTP_USER ?? '');
console.log('SMTP_PASS length=', passLength);
