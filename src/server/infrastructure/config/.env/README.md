# 🔐 Environment Configuration

## 📋 Purpose

The `.env` folder contains environment-specific configuration files that define the application settings for different deployment contexts. These files:

- Provide default values for environment variables
- Define environment-specific settings for development, testing, and production
- Serve as templates for configuring the application in different environments
- Document all available configuration options

## 🧩 Key Components

### 1️⃣ Environment Files

- **`.env.development`**: Configuration for local development environments
- **`.env.test`**: Configuration for automated testing environments
- **`.env.production`**: Template for production deployment settings

### 2️⃣ Configuration Categories

Each file contains settings organized by functional area:

- **Database**: Connection strings, pool settings, and database options
- **Server**: HTTP server configuration, ports, and runtime settings
- **Security**: Authentication secrets, encryption keys, and security policies
- **Email**: SMTP server settings and email delivery configuration
- **Cache**: In-memory or Redis cache configuration and connection settings
- **Storage**: File storage locations, limits, and image processing options
- **Media**: Upload restrictions and supported file types
- **Logging**: Log levels and output configuration

## 🛠️ Usage Instructions

### Local Development

For local development, the `.env.development` file is loaded automatically:

```bash
# Start the app in development mode
npm run dev
```

### Testing

The `.env.test` file is used during automated testing:

```bash
# Run tests with test environment settings
npm test
```

### Production Deployment

For production, create a proper `.env` file based on the `.env.production` template:

```bash
# Copy the production template (DO NOT use as-is)
cp .env.production .env

# Edit with secure values for production
nano .env

# Start the application
npm start
```

## ⚙️ Available Configuration Options

### Database Configuration

```
DB_HOST=localhost                # Database server hostname
DB_PORT=5432                     # Database server port
DB_USER=postgres                 # Database username
DB_PASSWORD=postgres             # Database password
DB_NAME=abe_stack                # Database name
DB_FALLBACK=false                # Whether to use fallback database
DATABASE_URL=postgresql://...    # Full database connection string
```

### Cache Configuration

```
CACHE_PROVIDER=redis             # Cache provider: 'memory' or 'redis'
CACHE_REDIS_HOST=localhost       # Redis server hostname
CACHE_REDIS_PORT=6379            # Redis server port
CACHE_REDIS_PASSWORD=password    # Redis server password (optional)
CACHE_REDIS_DB=0                 # Redis database number
CACHE_REDIS_KEY_PREFIX=app-cache: # Prefix for all cache keys
```

### Storage Configuration

```
UPLOAD_DIR=uploads               # Directory for file uploads
TEMP_DIR=uploads/temp            # Directory for temporary files
STORAGE_PATH=uploads             # Base storage path
STORAGE_URL=http://localhost:8080/uploads # Public URL for stored files
```

## 🏗️ Architecture Decisions

### Environment-Specific Files

- **Decision**: Maintain separate files for different environments
- **Rationale**: Provides clear separation of settings between environments
- **Benefit**: Prevents accidental use of development settings in production

### Default Values Pattern

- **Decision**: Include sensible defaults for all settings
- **Rationale**: Makes local development easier with minimal configuration
- **Tradeoffs**: Production environments should override security-sensitive defaults

### Comprehensive Documentation

- **Decision**: Document all variables with descriptive comments
- **Rationale**: Simplifies understanding of available options
- **Benefit**: Serves as self-documenting configuration reference

### Template Approach

- **Decision**: Store production file as a template rather than actual values
- **Rationale**: Prevents secrets from being committed to source control
- **Implementation**: Actual values should be set through environment or secure storage

## ⚙️ Setup and Configuration Notes

### Security Considerations

- **Never commit actual production values** to source control
- Replace placeholder secrets with proper values in production
- Use a secrets management system for sensitive values in deployed environments
- All secrets should be at least 32 characters long for adequate security

### Environment Variables Precedence

The loading order of environment variables is:

1. System environment variables (highest precedence)
2. `.env` file in project root (if present)
3. Environment-specific files (`.env.development`, `.env.test`, `.env.production`)
4. Default values from code (lowest precedence)

### Required Variables

At minimum, these variables should be set for production:

```
NODE_ENV=production
DATABASE_URL=<connection-string>
JWT_SECRET=<secure-random-string>
JWT_REFRESH_SECRET=<secure-random-string>
SIGNATURE_SECRET=<secure-random-string>
PASSWORD_SALT=<secure-random-string>
```

### Configuration Validation

The application validates the environment variables at startup and will throw errors for invalid configurations. See the validation rules in the configuration domain for details.
