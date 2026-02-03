// packages/db/src/benchmark/db-benchmark.ts
/* eslint-disable no-console */
// packages/db/src/benchmark/db-benchmark.ts
/**
 * Database Execution Benchmark: Raw SQL Query Builder
 *
 * Benchmarks the performance of the raw SQL query builder.
 * Requires a running PostgreSQL database.
 *
 * Run: npx tsx packages/db/src/benchmark/db-benchmark.ts
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   BENCHMARK_ITERATIONS - Number of iterations (default: 1000)
 */

import { createRawDb, select, insert, update, deleteFrom, eq, and, gt } from '../index';

// ============================================================================
// Configuration
// ============================================================================

const CONNECTION_STRING = process.env.DATABASE_URL ?? 'postgres://postgres@localhost:5432/abe_stack_dev';
const ITERATIONS = Number(process.env.BENCHMARK_ITERATIONS) || 1000;

// ============================================================================
// Benchmark Types
// ============================================================================

interface BenchmarkUser extends Record<string, unknown> {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  login_count: number;
  created_at: Date;
}

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTimeMs: number;
  avgTimeMs: number;
  opsPerSecond: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

// ============================================================================
// Benchmark Utilities
// ============================================================================

async function runAsyncBenchmark(
  name: string,
  iterations: number,
  fn: () => Promise<void>,
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warm up (10% of iterations)
  const warmupCount = Math.max(10, Math.floor(iterations * 0.1));
  for (let i = 0; i < warmupCount; i++) {
    await fn();
  }

  // Run benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  // Calculate stats
  times.sort((a, b) => a - b);
  const totalTimeMs = times.reduce((sum, t) => sum + t, 0);
  const avgTimeMs = totalTimeMs / iterations;
  const opsPerSecond = Math.round(1000 / avgTimeMs);
  const p50Ms = times[Math.floor(iterations * 0.5)] ?? 0;
  const p95Ms = times[Math.floor(iterations * 0.95)] ?? 0;
  const p99Ms = times[Math.floor(iterations * 0.99)] ?? 0;

  return { name, iterations, totalTimeMs, avgTimeMs, opsPerSecond, p50Ms, p95Ms, p99Ms };
}

function formatResult(result: BenchmarkResult): string {
  return [
    `  ${result.name}:`,
    `    Total: ${result.totalTimeMs.toFixed(2)}ms`,
    `    Avg: ${result.avgTimeMs.toFixed(3)}ms`,
    `    P50: ${result.p50Ms.toFixed(3)}ms`,
    `    P95: ${result.p95Ms.toFixed(3)}ms`,
    `    P99: ${result.p99Ms.toFixed(3)}ms`,
    `    Ops/sec: ${result.opsPerSecond.toLocaleString()}`,
  ].join('\n');
}

// ============================================================================
// Setup & Teardown
// ============================================================================

async function setupBenchmarkTable(rawDb: ReturnType<typeof createRawDb>): Promise<void> {
  console.log('Setting up benchmark table...');

  // Create table if not exists
  await rawDb.raw(`
    CREATE TABLE IF NOT EXISTS benchmark_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      login_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  // Clear existing data
  await rawDb.raw('TRUNCATE benchmark_users');

  console.log('Benchmark table ready.\n');
}

async function seedTestData(rawDb: ReturnType<typeof createRawDb>, count: number): Promise<string[]> {
  console.log(`Seeding ${count} test users...`);

  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const result = await rawDb.query<{ id: string }>(
      insert('benchmark_users')
        .values({
          email: `bench-${String(i)}-${Date.now()}@test.com`,
          name: `Test User ${String(i)}`,
          active: i % 2 === 0,
          login_count: i % 100,
        })
        .returning('id')
        .toSql()
    );
    if (result[0]) {
      ids.push(result[0].id);
    }
  }

  console.log(`Seeded ${ids.length} users.\n`);
  return ids;
}

// ============================================================================
// Benchmarks
// ============================================================================

async function benchmarkSelectById(
  rawDb: ReturnType<typeof createRawDb>,
  userIds: string[],
): Promise<void> {
  console.log('\n--- SELECT by ID ---\n');

  let idx = 0;
  const getNextId = () => {
    const id = userIds[idx % userIds.length];
    idx++;
    return id!;
  };

  const result = await runAsyncBenchmark('Raw SQL', ITERATIONS, async () => {
    const id = getNextId();
    await rawDb.queryOne<BenchmarkUser>(
      select('benchmark_users')
        .where(eq('id', id))
        .toSql()
    );
  });
  console.log(formatResult(result));
}

async function benchmarkSelectWithConditions(
  rawDb: ReturnType<typeof createRawDb>,
): Promise<void> {
  console.log('\n--- SELECT with complex WHERE ---\n');

  const result = await runAsyncBenchmark('Raw SQL', ITERATIONS, async () => {
    await rawDb.query<BenchmarkUser>(
      select('benchmark_users')
        .where(and(
          eq('active', true),
          gt('login_count', 50)
        ))
        .orderBy('created_at', 'desc')
        .limit(10)
        .toSql()
    );
  });
  console.log(formatResult(result));
}

async function benchmarkInsert(
  rawDb: ReturnType<typeof createRawDb>,
): Promise<void> {
  console.log('\n--- INSERT single row ---\n');

  let counter = 0;

  const result = await runAsyncBenchmark('Raw SQL', ITERATIONS, async () => {
    counter++;
    await rawDb.query<{ id: string }>(
      insert('benchmark_users')
        .values({
          email: `raw-insert-${String(counter)}-${Date.now()}@test.com`,
          name: `Raw Insert ${String(counter)}`,
        })
        .returning('id')
        .toSql()
    );
  });
  console.log(formatResult(result));
}

async function benchmarkUpdate(
  rawDb: ReturnType<typeof createRawDb>,
  userIds: string[],
): Promise<void> {
  console.log('\n--- UPDATE single row ---\n');

  let idx = 0;
  const getNextId = () => {
    const id = userIds[idx % userIds.length];
    idx++;
    return id!;
  };

  const result = await runAsyncBenchmark('Raw SQL', ITERATIONS, async () => {
    const id = getNextId();
    await rawDb.execute(
      update('benchmark_users')
        .set({ name: `Updated ${Date.now()}` })
        .where(eq('id', id))
        .toSql()
    );
  });
  console.log(formatResult(result));
}

async function benchmarkDelete(
  rawDb: ReturnType<typeof createRawDb>,
): Promise<void> {
  console.log('\n--- DELETE with condition ---\n');

  // Seed some data to delete
  for (let i = 0; i < ITERATIONS * 2; i++) {
    await rawDb.query(
      insert('benchmark_users')
        .values({
          email: `delete-test-${String(i)}-${Date.now()}@test.com`,
          name: `Delete Test ${String(i)}`,
          active: false,
          login_count: -1,
        })
        .toSql()
    );
  }

  const result = await runAsyncBenchmark('Raw SQL', ITERATIONS, async () => {
    await rawDb.execute(
      deleteFrom('benchmark_users')
        .where(and(
          eq('active', false),
          eq('login_count', -1)
        ))
        .toSql()
    );
    // Re-add one for next iteration
    await rawDb.query(
      insert('benchmark_users')
        .values({
          email: `delete-refill-${Date.now()}@test.com`,
          active: false,
          login_count: -1,
        })
        .toSql()
    );
  });
  console.log(formatResult(result));
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('DATABASE EXECUTION BENCHMARK: Raw SQL Query Builder');
  console.log('='.repeat(60));
  console.log();
  console.log(`Connection: ${CONNECTION_STRING.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`Iterations per test: ${ITERATIONS}`);
  console.log();

  // Create client
  const rawDb = createRawDb(CONNECTION_STRING);

  try {
    // Setup
    await setupBenchmarkTable(rawDb);
    const userIds = await seedTestData(rawDb, 100);

    // Run benchmarks
    await benchmarkSelectById(rawDb, userIds);
    await benchmarkSelectWithConditions(rawDb);
    await benchmarkInsert(rawDb);
    await benchmarkUpdate(rawDb, userIds);
    await benchmarkDelete(rawDb);

    console.log('\n' + '='.repeat(60));
    console.log('BENCHMARK COMPLETE');
    console.log('='.repeat(60));

  } finally {
    // Cleanup
    console.log('\nCleaning up...');
    await rawDb.raw('DROP TABLE IF EXISTS benchmark_users');
    await rawDb.close();
    console.log('Done.');
  }
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
