# 🔒 Secrets Management

## 📋 Purpose

The secrets management module provides a secure way to access sensitive configuration values from various sources. It offers:

- A unified interface for retrieving secrets from different backends
- Multiple provider implementations for different environments
- Safe handling of sensitive data like API keys, passwords, and tokens
- Clear separation between regular configuration and sensitive values

This separation helps maintain security best practices by ensuring that sensitive values are properly managed and not exposed in regular configuration files.

## 🧩 Key Components

### 1️⃣ Secret Provider Interface

The `SecretProvider` interface defines the contract for all secret providers:

- **`initialize()`**: Sets up the provider (optional)
- **`supportsSecret(key)`**: Checks if a secret is available
- **`getSecret(key)`**: Retrieves a secret value

### 2️⃣ Provider Implementations

Several implementations are available for different environments:

- **`EnvSecretProvider`**: Retrieves secrets from environment variables (optionally with prefix)
- **`FileSecretProvider`**: Loads secrets from a JSON file
- **`InMemorySecretProvider`**: Stores secrets in memory (primarily for testing)

### 3️⃣ Module Exports (`index.ts`)

Exports all providers and interfaces for use throughout the application.

## 🛠️ Usage Instructions

### Dependency Injection Setup

```typescript
import { Container } from "inversify";
import {
  EnvSecretProvider,
  SecretProvider,
} from "@/server/infrastructure/config/secrets";
import { TYPES } from "@/server/infrastructure/di/types";

export function configureContainer(container: Container): void {
  // Register the secret provider
  container
    .bind<SecretProvider>(TYPES.SecretProvider)
    .to(EnvSecretProvider)
    .inSingletonScope();

  // To use a file-based provider:
  // container.bind<SecretProvider>(TYPES.SecretProvider)
  //   .to(FileSecretProvider)
  //   .inSingletonScope()
  //   .whenInjectedInto(SomeSpecificService);
}
```

### Accessing Secrets

```typescript
import { inject, injectable } from "inversify";
import { SecretProvider } from "@/server/infrastructure/config/secrets";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class AuthService {
  constructor(
    @inject(TYPES.SecretProvider) private secretProvider: SecretProvider,
  ) {}

  async generateToken(userId: string): Promise<string> {
    // Get the JWT secret key
    const jwtSecret = await this.secretProvider.getSecret("JWT_SECRET");
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    // Use the secret to generate a token
    return this.createJwtToken(userId, jwtSecret);
  }

  private createJwtToken(userId: string, secret: string): string {
    // Implementation details...
    return "token";
  }
}
```

### Using Environment-Based Secrets

```typescript
// In your container setup
import { EnvSecretProvider } from "@/server/infrastructure/config/secrets";

// With an optional prefix for secrets
const secretProvider = new EnvSecretProvider("SECRET");

// This will look for environment variables like:
// SECRET_JWT_KEY, SECRET_DB_PASSWORD, etc.
const jwtSecret = await secretProvider.getSecret("JWT_KEY");
```

### Using File-Based Secrets

```typescript
// In your container setup
import { FileSecretProvider } from "@/server/infrastructure/config/secrets";

// Path to secrets file
const secretProvider = new FileSecretProvider("./config/secrets.json");

// secrets.json format:
// {
//   "JWT_SECRET": "your-jwt-secret",
//   "DB_PASSWORD": "your-db-password"
// }

// Initialize the provider (loads the secrets file)
await secretProvider.initialize();

const dbPassword = await secretProvider.getSecret("DB_PASSWORD");
```

## 🏗️ Architecture Decisions

### Provider Interface

- **Decision**: Use a common interface for all secret providers
- **Rationale**: Allows switching between different secret sources without changing application code
- **Benefit**: Easier to use different providers in different environments

### Multiple Provider Implementations

- **Decision**: Provide different implementations for various environments
- **Rationale**: Different environments have different security requirements
- **Example**: Environment variables for production, files for development

### Asynchronous API

- **Decision**: Use async methods for secret retrieval
- **Rationale**: Some secret sources (like key vaults) require async access
- **Benefit**: Consistent interface regardless of the underlying storage mechanism

### Optional Initialization

- **Decision**: Make initialization optional (provider-specific)
- **Rationale**: Some providers need setup, others don't
- **Implementation**: Providers can implement the `initialize()` method if needed

## ⚙️ Setup and Configuration Notes

### Environment Variables Provider

Best for production environments:

```typescript
// No prefix - uses environment variables directly
const provider = new EnvSecretProvider();

// With prefix - all secret names will be prefixed
const prefixedProvider = new EnvSecretProvider("APP_SECRET");
// Will look for APP_SECRET_JWT_KEY, APP_SECRET_DB_PASSWORD, etc.
```

### File Provider

Best for development or controlled environments:

```typescript
// Create a secrets.json file:
// {
//   "DB_PASSWORD": "dev-password",
//   "API_KEY": "dev-api-key"
// }

// Initialize the provider
const provider = new FileSecretProvider("./secrets.json");
await provider.initialize();
```

### In-Memory Provider

Best for testing:

```typescript
// For testing
const testProvider = new InMemorySecretProvider({
  DB_PASSWORD: "test-password",
  JWT_SECRET: "test-jwt-secret",
});

// Add more secrets as needed
testProvider.setSecret("API_KEY", "test-api-key");
```

### Security Considerations

- Never commit secrets files to source control
- Use environment variables or secure vault services in production
- Consider using a prefix for secret environment variables to distinguish them
- Implement proper access controls for any files containing secrets
- Rotate secrets regularly according to your security policy
