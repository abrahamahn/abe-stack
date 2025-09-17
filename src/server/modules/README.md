# Server Modules

This directory contains the core business logic modules of the application. Each module is self-contained and focuses on a specific domain area.

## Module Structure

Each module typically includes:

- **Models**: Data structures and business logic
- **Services**: Business operations and logic
- **Repositories**: Data access layer
- **Types**: TypeScript interfaces, types and enums

## Available Modules

- **auth**: Authentication and authorization
- **users**: User management
- **sessions**: Session handling
- **preferences**: User preferences
- **permission**: Role and permission management
- **geo**: Geolocation services
- **email**: Email services
- **utils**: Utility services

## Usage

Modules can be imported directly:

```typescript
import { User } from "@/server/modules/users";
import { AuthService } from "@/server/modules/auth";
```

Or you can use the module accessor utility:

```typescript
import { getModule } from "@/server/modules";

// Get the entire module
const userModule = getModule("users");

// Get a specific service from a module
const authService = getModule<AuthService>("auth", "AuthService");
```

## Module Design Principles

1. **Separation of Concerns**: Each module should handle a specific domain area
2. **Encapsulation**: Internal implementation details should be hidden
3. **Loose Coupling**: Minimize dependencies between modules
4. **SOLID Principles**: Follow SOLID design principles
5. **Clean Architecture**: Separate business logic from infrastructure concerns

## Creating a New Module

To create a new module:

1. Create a new directory for your module
2. Create the necessary model, service, and repository files
3. Create an index.ts file that exports the module's components
4. Update the main modules/index.ts file to include your new module
