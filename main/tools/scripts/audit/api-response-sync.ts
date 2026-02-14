// main/tools/scripts/audit/api-response-sync.ts
/**
 * API Response-Fidelity Validator
 *
 * Validates critical auth response contracts and runtime handler shapes for:
 * - POST /api/auth/login
 * - POST /api/auth/refresh
 * - GET  /api/users/me
 *
 * Usage:
 *   node --import tsx main/tools/scripts/audit/api-response-sync.ts
 *   node --import tsx main/tools/scripts/audit/api-response-sync.ts --fail-on-drift
 */

import fs from 'node:fs';
import path from 'node:path';

import { apiRouter } from '@abe-stack/shared';

type ContractCheck = {
  name: string;
  ok: boolean;
  detail?: string;
};

type RuntimeCheck = {
  file: string;
  name: string;
  ok: boolean;
  detail?: string;
};

type AuditReport = {
  contractChecks: ContractCheck[];
  runtimeChecks: RuntimeCheck[];
};

function readSource(relPath: string): string {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing source file: ${relPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function hasPattern(source: string, pattern: RegExp): boolean {
  return pattern.test(source);
}

function getContractChecks(): ContractCheck[] {
  const checks: ContractCheck[] = [];

  const login200 = apiRouter.auth.login.responses[200];
  const refresh200 = apiRouter.auth.refresh.responses[200];
  const usersMe200 = apiRouter.users.me.responses[200];

  const sampleUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'audit@example.com',
    username: 'audituser',
    firstName: 'Audit',
    lastName: 'User',
    avatarUrl: null,
    role: 'user',
    emailVerified: true,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    bio: null,
    city: null,
    state: null,
    country: null,
    language: null,
    website: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const loginBff = login200.safeParse({ user: sampleUser });
  checks.push({
    name: 'Contract login(200) accepts canonical BFF success shape',
    ok: loginBff.success,
    ...(loginBff.success ? {} : { detail: loginBff.error.message }),
  });

  const loginLegacy = login200.safeParse({ token: 'legacy-token', user: sampleUser });
  checks.push({
    name: 'Contract login(200) rejects legacy token success shape',
    ok: !loginLegacy.success,
    ...(loginLegacy.success ? { detail: 'legacy token shape unexpectedly accepted' } : {}),
  });

  const refreshOk = refresh200.safeParse({ token: 'refreshed-token' });
  checks.push({
    name: 'Contract refresh(200) accepts token response shape',
    ok: refreshOk.success,
    ...(refreshOk.success ? {} : { detail: refreshOk.error.message }),
  });

  const meOk = usersMe200.safeParse(sampleUser);
  checks.push({
    name: 'Contract users.me(200) accepts canonical user shape',
    ok: meOk.success,
    ...(meOk.success ? {} : { detail: meOk.error.message }),
  });

  return checks;
}

function getRuntimeChecks(): RuntimeCheck[] {
  const checks: RuntimeCheck[] = [];

  const loginFile = 'main/server/core/src/auth/handlers/login.ts';
  const refreshFile = 'main/server/core/src/auth/handlers/refresh.ts';
  const meFile = 'main/server/core/src/users/handlers/profile.ts';

  const loginSrc = readSource(loginFile);
  const refreshSrc = readSource(refreshFile);
  const meSrc = readSource(meFile);

  checks.push({
    file: loginFile,
    name: 'Runtime login(200) returns user payload',
    ok: hasPattern(loginSrc, /body:\s*\{\s*user:\s*result\.user/s),
  });
  checks.push({
    file: loginFile,
    name: 'Runtime login(200) does not return token field',
    ok: !hasPattern(loginSrc, /body:\s*\{[\s\S]*token:\s*result\.accessToken/s),
  });

  checks.push({
    file: refreshFile,
    name: 'Runtime refresh(200) returns token field',
    ok: hasPattern(refreshSrc, /body:\s*\{\s*token:\s*result\.accessToken\s*\}/s),
  });

  checks.push({
    file: meFile,
    name: 'Runtime users.me(200) returns canonical user object',
    ok:
      hasPattern(meSrc, /const body:\s*User\s*=\s*\{/s) &&
      hasPattern(meSrc, /id:\s*user\.id/s) &&
      hasPattern(meSrc, /email:\s*user\.email/s) &&
      hasPattern(meSrc, /username:\s*user\.username/s) &&
      hasPattern(meSrc, /return\s*\{\s*status:\s*HTTP_STATUS\.OK,\s*body/s),
  });

  return checks;
}

function printReport(report: AuditReport): void {
  const contractFailures = report.contractChecks.filter((c) => !c.ok);
  const runtimeFailures = report.runtimeChecks.filter((c) => !c.ok);

  console.log('\nAPI Response-Fidelity Report\n');
  console.log(`Contract checks: ${String(report.contractChecks.length)}`);
  console.log(`Runtime checks:  ${String(report.runtimeChecks.length)}`);
  console.log(`Failures:        ${String(contractFailures.length + runtimeFailures.length)}`);

  if (contractFailures.length > 0) {
    console.log('\nContract failures:\n');
    for (const f of contractFailures) {
      console.log(`  - ${f.name}`);
      if (f.detail !== undefined) console.log(`    ${f.detail}`);
    }
  }

  if (runtimeFailures.length > 0) {
    console.log('\nRuntime failures:\n');
    for (const f of runtimeFailures) {
      console.log(`  - ${f.name} (${f.file})`);
      if (f.detail !== undefined) console.log(`    ${f.detail}`);
    }
  }
}

const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  process.argv[1].includes('api-response-sync') &&
  process.env['VITEST'] === undefined;

if (isMainModule) {
  const shouldFailOnDrift = process.argv.includes('--fail-on-drift');

  try {
    const report: AuditReport = {
      contractChecks: getContractChecks(),
      runtimeChecks: getRuntimeChecks(),
    };
    printReport(report);

    const hasFailures =
      report.contractChecks.some((c) => !c.ok) || report.runtimeChecks.some((c) => !c.ok);

    if (shouldFailOnDrift && hasFailures) {
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
