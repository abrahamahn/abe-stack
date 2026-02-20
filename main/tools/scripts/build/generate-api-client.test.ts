// main/tools/scripts/build/generate-api-client.test.ts
/**
 * API Client Generator Tests
 */

import { describe, expect, it } from 'vitest';

import { generateApiClientSource } from './generate-api-client';

// ============================================================================
// Test Helpers
// ============================================================================

function createRoute(overrides: {
  path: string;
  method?: string;
  isPublic?: boolean;
  roles?: string[];
  hasSchema?: boolean;
  module?: string;
  deprecated?: boolean;
  summary?: string;
}): {
  path: string;
  method: string;
  isPublic: boolean;
  roles: string[];
  hasSchema: boolean;
  module: string;
  deprecated?: boolean;
  summary?: string;
} {
  return {
    method: 'GET',
    isPublic: false,
    roles: [],
    hasSchema: false,
    module: 'test',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('generateApiClientSource', () => {
  it('should generate valid TypeScript source code', () => {
    const source = generateApiClientSource({
      routes: [
        createRoute({ path: '/api/auth/login', method: 'POST', isPublic: true, module: 'auth' }),
        createRoute({ path: '/api/users', method: 'GET', module: 'users' }),
      ],
    });

    expect(source).toContain('class GeneratedApiClient');
    expect(source).toContain('interface ApiClientConfig');
    expect(source).toContain('interface ApiResponse');
    expect(source).toContain('class ApiError');
    expect(source).toContain('createGeneratedApiClient');
  });

  it('should generate methods for each route', () => {
    const source = generateApiClientSource({
      routes: [
        createRoute({ path: '/api/auth/login', method: 'POST', module: 'auth' }),
        createRoute({ path: '/api/auth/logout', method: 'POST', module: 'auth' }),
        createRoute({ path: '/api/users', method: 'GET', module: 'users' }),
      ],
    });

    expect(source).toContain('async authLogin(');
    expect(source).toContain('async authLogout(');
    expect(source).toContain('async users(');
  });

  it('should handle path parameters', () => {
    const source = generateApiClientSource({
      routes: [
        createRoute({ path: '/api/users/:id', method: 'GET', module: 'users' }),
      ],
    });

    expect(source).toContain('params: { id: string }');
    expect(source).toContain('${params.id}');
  });

  it('should add body parameter for POST/PUT/PATCH routes', () => {
    const source = generateApiClientSource({
      routes: [
        createRoute({ path: '/api/users', method: 'POST', module: 'users' }),
        createRoute({ path: '/api/users/:id', method: 'PUT', module: 'users' }),
      ],
    });

    expect(source).toContain('body: unknown');
  });

  it('should not add body parameter for GET/DELETE routes', () => {
    const source = generateApiClientSource({
      routes: [
        createRoute({ path: '/api/users', method: 'GET', module: 'users' }),
        createRoute({ path: '/api/users/:id', method: 'DELETE', module: 'users' }),
      ],
    });

    // GET method should not have body parameter
    const getMethod = source.split('async users(')[1]?.split(')')[0];
    expect(getMethod).not.toContain('body');
  });

  it('should include JSDoc comments with auth info', () => {
    const source = generateApiClientSource({
      routes: [
        createRoute({ path: '/api/auth/login', method: 'POST', isPublic: true }),
        createRoute({ path: '/api/admin/users', method: 'GET', roles: ['admin'] }),
        createRoute({ path: '/api/users/me', method: 'GET' }),
      ],
    });

    expect(source).toContain('@auth Public');
    expect(source).toContain('@auth Roles: admin');
    expect(source).toContain('@auth Authenticated');
  });

  it('should mark deprecated routes', () => {
    const source = generateApiClientSource({
      routes: [
        createRoute({ path: '/api/old/endpoint', method: 'GET', deprecated: true }),
      ],
    });

    expect(source).toContain('@deprecated');
  });

  it('should include summary in JSDoc', () => {
    const source = generateApiClientSource({
      routes: [
        createRoute({ path: '/api/users', method: 'GET', summary: 'List all users' }),
      ],
    });

    expect(source).toContain('List all users');
  });

  it('should include file header with metadata', () => {
    const source = generateApiClientSource({
      routes: [createRoute({ path: '/api/test', method: 'GET' })],
    });

    expect(source).toContain('Auto-generated API client');
    expect(source).toContain('Route count: 1');
    expect(source).toContain('Generated at:');
  });

  it('should generate request helper with correct fetch logic', () => {
    const source = generateApiClientSource({
      routes: [createRoute({ path: '/api/test', method: 'GET' })],
    });

    expect(source).toContain('private async request<T>');
    expect(source).toContain('Content-Type');
    expect(source).toContain('application/json');
    expect(source).toContain('JSON.stringify(body)');
    expect(source).toContain('throw new ApiError');
  });

  it('should handle empty route list', () => {
    const source = generateApiClientSource({ routes: [] });

    expect(source).toContain('class GeneratedApiClient');
    expect(source).toContain('Route count: 0');
  });

  it('should handle routes with multiple path parameters', () => {
    const source = generateApiClientSource({
      routes: [
        createRoute({ path: '/api/tenants/:tenantId/users/:userId', method: 'GET' }),
      ],
    });

    expect(source).toContain('tenantId: string');
    expect(source).toContain('userId: string');
    expect(source).toContain('${params.tenantId}');
    expect(source).toContain('${params.userId}');
  });

  it('should generate factory function', () => {
    const source = generateApiClientSource({
      routes: [createRoute({ path: '/api/test', method: 'GET' })],
    });

    expect(source).toContain('export function createGeneratedApiClient');
    expect(source).toContain('return new GeneratedApiClient(config)');
  });

  it('should support custom baseUrl parameter name', () => {
    const source = generateApiClientSource({
      routes: [createRoute({ path: '/api/test', method: 'GET' })],
      baseUrlParam: 'apiEndpoint',
    });

    expect(source).toContain('apiEndpoint: string');
    expect(source).toContain('this.apiEndpoint');
  });

  it('should omit JSDoc when disabled', () => {
    const source = generateApiClientSource({
      routes: [
        createRoute({ path: '/api/test', method: 'GET', summary: 'Test endpoint' }),
      ],
      includeJsDoc: false,
    });

    expect(source).not.toContain('Test endpoint');
    expect(source).not.toContain('@auth');
  });
});
