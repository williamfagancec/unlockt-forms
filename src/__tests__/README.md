# Unit Tests

This directory contains comprehensive unit tests for the Unlockt Insurance Form Application.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run tests for CI/CD
npm run test:ci
```

## Test Structure

Tests are organized by layer:

- `utils/` - Utility function tests
- `middleware/` - Middleware tests
- `services/` - Business logic tests
- `repositories/` - Data access tests
- `controllers/` - Controller tests

## Coverage Thresholds

Minimum coverage requirements:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Best Practices

1. Use descriptive test names that explain the expected behavior
2. Follow AAA pattern: Arrange, Act, Assert
3. Mock external dependencies
4. Test edge cases and error conditions
5. Keep tests isolated and independent
6. Use `beforeEach` and `afterEach` for setup/teardown