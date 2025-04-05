# 🧪 Testing Documentation

## 📋 Overview

This directory contains all test files for the application, organized into different test types for comprehensive test coverage. Our testing strategy aims to ensure code quality, catch bugs early, and maintain a robust codebase.

## 📂 Directory Structure

| Directory                       | Description                                                              |
| ------------------------------- | ------------------------------------------------------------------------ |
| [`server/`](./server/README.md) | Tests for server-side code, including unit, integration, and API tests   |
| [`client/`](./client/README.md) | Tests for client-side code, including component, hook, and utility tests |
| [`e2e/`](./e2e/README.md)       | End-to-end tests covering full application workflows                     |
| [`mocks/`](./mocks/README.md)   | Shared mock data, fixtures, and test utilities                           |

## 🔧 Testing Frameworks & Tools

Our testing stack includes:

- **Test Runner**: Vitest for unit and integration tests
- **Assertion Library**: Vitest built-in assertions
- **Mocking**: Vitest built-in mocking capabilities and custom mock utilities
- **E2E Testing**: Playwright for browser-based end-to-end testing
- **Coverage**: Istanbul integrated with Vitest for coverage reporting

## ▶️ Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e        # End-to-end tests
npm run test:coverage   # Generate test coverage report

# Watch mode for development
npm run test:watch

# Run tests in a specific directory
npx vitest run server/unit

# Run a specific test file
npx vitest run server/unit/infrastructure/cache.test.ts
```

## 📝 Test Writing Guidelines

### Test Structure

We follow the Arrange-Act-Assert (AAA) pattern:

```typescript
it("should create a cache entry", async () => {
  // Arrange: Set up test data and conditions
  const cacheService = new CacheService();
  const key = "test-key";
  const value = { data: "test-value" };

  // Act: Perform the action being tested
  await cacheService.set(key, value);

  // Assert: Check the expected outcomes
  const cachedValue = await cacheService.get(key);
  expect(cachedValue).toEqual(value);
});
```

### Naming Conventions

- **Test Suites**: `describe('ComponentName', () => { ... })`
- **Test Cases**: `it('should perform specific behavior when condition', () => { ... })`
- **Test Files**: `[component-name].test.ts` or `[component-name].spec.ts`

### Best Practices

1. **Test Independence**: Each test should run independently without relying on other tests
2. **Mock External Dependencies**: Use mocks for external services, APIs, and databases
3. **Clean Up**: Properly clean up resources after tests complete
4. **Focus on Behavior**: Test what the code does, not how it does it
5. **Coverage Balance**: Aim for high coverage while prioritizing critical paths
6. **Test Both Success and Error Cases**: Verify error handling and edge cases
7. **Keep Tests Simple**: Minimize complexity and conditional logic in tests
8. **Descriptive Error Messages**: Use clear assertions with helpful messages

## 🛡️ Test Coverage

We track test coverage using Istanbul integrated with Vitest. Our coverage goals are:

- **Unit Tests**: 90% coverage
- **Integration Tests**: 80% coverage
- **Overall Coverage**: 85% minimum

Coverage reports are generated with each CI run and stored as artifacts. You can also generate them locally with `npm run test:coverage`.

## 🔄 Continuous Integration

Tests are automatically run:

- On every pull request
- On merges to main branch
- Nightly on the main branch

Failed tests block PRs from being merged, ensuring test-verified code quality.

## 📚 Further Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Internal Testing Guide](../../docs/testing.md)
- [Mock Data Dictionary](./mocks/README.md)
