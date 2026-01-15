#!/usr/bin/env tsx
// tools/dev/test-all.ts
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

type VitestSummary = {
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  pending: number;
};

type TestTarget = {
  name: string;
  cwd: string;
};

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const RESULTS_DIR = path.join(ROOT_DIR, '.cache', 'test-results');

const targets: TestTarget[] = [
  { name: 'ui', cwd: path.join(ROOT_DIR, 'packages', 'ui') },
  { name: 'web', cwd: path.join(ROOT_DIR, 'apps', 'web') },
  { name: 'server', cwd: path.join(ROOT_DIR, 'apps', 'server') },
  { name: 'core', cwd: path.join(ROOT_DIR, 'packages', 'core') },
  { name: 'sdk', cwd: path.join(ROOT_DIR, 'packages', 'sdk') },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readJson(filePath: string): unknown {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as unknown;
}

function summarizeVitestReport(name: string, report: unknown): VitestSummary {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let todo = 0;
  let pending = 0;

  if (isRecord(report)) {
    const numTotal = report.numTotalTests;
    const numPassed = report.numPassedTests;
    const numFailed = report.numFailedTests;
    const numSkipped = report.numSkippedTests;
    const numTodo = report.numTodoTests;
    const numPending = report.numPendingTests;

    if (
      typeof numTotal === 'number' &&
      typeof numPassed === 'number' &&
      typeof numFailed === 'number'
    ) {
      total = numTotal;
      passed = numPassed;
      failed = numFailed;
      skipped = typeof numSkipped === 'number' ? numSkipped : 0;
      todo = typeof numTodo === 'number' ? numTodo : 0;
      pending = typeof numPending === 'number' ? numPending : 0;
    }
  }

  if (total === 0 && isRecord(report)) {
    const testResults = report.testResults;
    if (Array.isArray(testResults)) {
      for (const testFile of testResults) {
        if (!isRecord(testFile)) continue;
        const assertionResults = testFile.assertionResults;
        if (!Array.isArray(assertionResults)) continue;
        for (const assertion of assertionResults) {
          if (!isRecord(assertion)) continue;
          const status = assertion.status;
          switch (status) {
            case 'passed':
              passed += 1;
              break;
            case 'failed':
              failed += 1;
              break;
            case 'skipped':
            case 'disabled':
              skipped += 1;
              break;
            case 'todo':
              todo += 1;
              break;
            case 'pending':
              pending += 1;
              break;
            default:
              break;
          }
        }
      }
    }
  }

  total = total || passed + failed + skipped + todo + pending;

  return {
    name,
    total,
    passed,
    failed,
    skipped,
    todo,
    pending,
  };
}

function runTarget(target: TestTarget): VitestSummary {
  const outputFile = path.join(RESULTS_DIR, `${target.name}.json`);
  const args = ['test', '--', '--reporter=json', '--outputFile', outputFile];

  const result = spawnSync('pnpm', args, {
    cwd: target.cwd,
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    const status = result.status ?? 1;
    console.error(`❌ Tests failed for ${target.name}.`);
    process.exit(status);
  }

  const report = readJson(outputFile);
  return summarizeVitestReport(target.name, report);
}

function printSummary(summaries: VitestSummary[]): void {
  const totals = summaries.reduce(
    (acc, summary) => ({
      total: acc.total + summary.total,
      passed: acc.passed + summary.passed,
      failed: acc.failed + summary.failed,
      skipped: acc.skipped + summary.skipped,
      todo: acc.todo + summary.todo,
      pending: acc.pending + summary.pending,
    }),
    { total: 0, passed: 0, failed: 0, skipped: 0, todo: 0, pending: 0 },
  );

  console.log('\nTest Summary');
  console.log('============');
  for (const summary of summaries) {
    console.log(
      `${summary.name}: ${String(summary.passed)}/${String(summary.total)} passed, ${String(summary.failed)} failed, ${String(summary.skipped)} skipped, ${String(summary.todo)} todo`,
    );
  }
  console.log('------------');
  console.log(
    `total: ${String(totals.passed)}/${String(totals.total)} passed, ${String(totals.failed)} failed, ${String(totals.skipped)} skipped, ${String(totals.todo)} todo`,
  );
}

mkdirSync(RESULTS_DIR, { recursive: true });

const summaries = targets.map((target) => runTarget(target));
printSummary(summaries);
