// main/tools/scripts/audit/db-schema-audit.ts
/**
 * DB Schema Audit
 *
 * Static checks:
 * - REQUIRED_TABLES (runtime expectation) vs tables created by migrations
 * - REQUIRED_TABLES vs tables created by db:push (dev schema push)
 * - REQUIRED_TABLES vs schema table-name constants (main/server/db/src/schema)
 *
 * Optional runtime check (requires a running DB):
 * - REQUIRED_TABLES vs actual tables in the connected database
 *
 * Usage:
 *   pnpm db:audit
 *   pnpm db:audit -- --db
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { buildConnectionString, createDbClient } from '@bslt/db';
import { initEnv } from '@bslt/server-system';

import * as schema from '../../../server/db/src/schema';
import { REQUIRED_TABLES } from '../../../server/db/src/validation';

type AuditResult = {
  ok: boolean;
  missingInMigrations: string[];
  missingInDbPush: string[];
  missingInSchemaConstants: string[];
  missingInDatabase?: string[];
  extraInMigrations: string[];
  extraInDbPush: string[];
  extraInSchemaConstants: string[];
};

function uniqSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function stripQuotes(ident: string): string {
  return ident.replaceAll('"', '');
}

function tableFromIdentifier(identifier: string): string {
  const stripped = stripQuotes(identifier.trim());
  const parts = stripped.split('.');
  return parts[parts.length - 1] ?? stripped;
}

function extractTablesFromSql(sql: string): string[] {
  // Remove common SQL comments to avoid false positives when scanning source files.
  // This is intentionally simple and conservative for auditing.
  const withoutLineComments = sql.replaceAll(/--.*$/gm, '');
  const withoutBlockComments = withoutLineComments.replaceAll(/\/\*[\s\S]*?\*\//g, '');

  // Handles:
  // - CREATE TABLE foo (...)
  // - CREATE TABLE IF NOT EXISTS foo (...)
  // - CREATE TABLE public.foo (...)
  // - CREATE TABLE "public"."foo" (...)
  const re =
    /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)/gi;

  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(withoutBlockComments)) != null) {
    const raw = m[1];
    if (!raw) continue;
    out.push(tableFromIdentifier(raw));
  }
  return out;
}

function extractTablesFromMigrations(migrationsDir: string): string[] {
  if (!existsSync(migrationsDir)) return [];
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const tables: string[] = [];
  for (const f of files) {
    const full = join(migrationsDir, f);
    const sql = readFileSync(full, 'utf-8');
    tables.push(...extractTablesFromSql(sql));
  }
  return uniqSorted(tables);
}

function extractTablesFromDbPush(dbPushPath: string): string[] {
  if (!existsSync(dbPushPath)) return [];
  const content = readFileSync(dbPushPath, 'utf-8');
  return uniqSorted(extractTablesFromSql(content));
}

function extractSchemaTableConstants(): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(schema)) {
    if (k.endsWith('_TABLE') && typeof v === 'string') out.push(v);
  }
  return uniqSorted(out);
}

function diff(a: readonly string[], b: readonly string[]): { missing: string[]; extra: string[] } {
  const as = new Set(a);
  const bs = new Set(b);
  const missing = a.filter((x) => !bs.has(x));
  const extra = b.filter((x) => !as.has(x));
  return { missing: uniqSorted(missing), extra: uniqSorted(extra) };
}

async function getDbTables(): Promise<string[]> {
  initEnv();
  const conn = buildConnectionString();
  const db = createDbClient(conn);
  try {
    const rows = await db.raw<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );
    return uniqSorted(rows.map((r) => r.tablename));
  } finally {
    await db.close();
  }
}

function printList(title: string, values: readonly string[]): void {
  if (values.length === 0) return;
  console.log(`\n${title} (${values.length}):`);
  for (const v of values) console.log(`- ${v}`);
}

async function run(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const checkDb = args.has('--db');

  const repoRoot = process.cwd();
  const required = uniqSorted(REQUIRED_TABLES);

  const migrationsDir = join(repoRoot, 'main/server/db/migrations');
  const dbPushPath = join(repoRoot, 'main/tools/scripts/db/push.ts');

  const migrationTables = extractTablesFromMigrations(migrationsDir);
  const dbPushTables = extractTablesFromDbPush(dbPushPath);
  const schemaTables = extractSchemaTableConstants();

  const mig = diff(required, migrationTables);
  const push = diff(required, dbPushTables);
  const schema = diff(required, schemaTables);

  let dbMissing: string[] | undefined;
  if (checkDb) {
    const dbTables = await getDbTables();
    dbMissing = diff(required, dbTables).missing;
  }

  const result: AuditResult = {
    ok:
      mig.missing.length === 0 &&
      push.missing.length === 0 &&
      schema.missing.length === 0 &&
      (dbMissing == null || dbMissing.length === 0),
    missingInMigrations: mig.missing,
    missingInDbPush: push.missing,
    missingInSchemaConstants: schema.missing,
    missingInDatabase: dbMissing,
    extraInMigrations: mig.extra,
    extraInDbPush: push.extra,
    extraInSchemaConstants: schema.extra,
  };

  console.log('DB Schema Audit');
  console.log(`- REQUIRED_TABLES: ${required.length}`);
  console.log(`- migrations tables: ${migrationTables.length}`);
  console.log(`- db:push tables: ${dbPushTables.length}`);
  console.log(`- schema constants: ${schemaTables.length}`);
  if (checkDb) console.log(`- db check: enabled`);

  printList('Missing in migrations', result.missingInMigrations);
  printList('Missing in db:push', result.missingInDbPush);
  printList('Missing in schema constants', result.missingInSchemaConstants);
  if (checkDb) printList('Missing in database', result.missingInDatabase ?? []);

  // Extras are informative, but not necessarily errors (migrations may include helper tables, etc.)
  printList('Extra in migrations (not in REQUIRED_TABLES)', result.extraInMigrations);
  printList('Extra in db:push (not in REQUIRED_TABLES)', result.extraInDbPush);
  printList('Extra in schema constants (not in REQUIRED_TABLES)', result.extraInSchemaConstants);

  if (!result.ok) {
    console.error('\n❌ DB schema audit failed.');
    process.exit(1);
  }

  console.log('\n✅ DB schema audit passed.');
}

const isMain = process.argv[1]?.includes('db-schema-audit') ?? false;
if (isMain) {
  run().catch((err) => {
    console.error('❌ DB schema audit crashed:', err);
    process.exit(1);
  });
}
