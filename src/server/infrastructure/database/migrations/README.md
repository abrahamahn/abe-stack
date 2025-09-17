# Database Migrations

This directory contains database migration scripts that establish and maintain the database schema for the application.

## Authentication System Migrations

The authentication system migrations create all the necessary tables and default data for implementing a complete auth system including:

- User accounts
- Roles and permissions
- JWT tokens
- Password reset tokens
- Email verification
- Multi-factor authentication
- User profiles
- User preferences
- User connections

## How to Use

### Create a New Migration

To create a new migration file:

```bash
# In your terminal
npx ts-node src/tools/migrations.ts create <migration-name>
```

This creates a new migration file in the `migrations` directory with a timestamp.

### Create the Auth System

To set up the complete authentication system at once:

```bash
# In your terminal
npx ts-node src/tools/migrations.ts auth
```

This creates a migration file with all auth-related tables.

### Run Migrations

To run all pending migrations:

```bash
# In your terminal
npx ts-node src/tools/migrations.ts migrate
```

### Check Migration Status

To see which migrations have been executed and which are pending:

```bash
# In your terminal
npx ts-node src/tools/migrations.ts status
```

### Rollback a Migration

To roll back the most recent migration:

```bash
# In your terminal
npx ts-node src/tools/migrations.ts rollback
```

## Auth Database Schema

The auth system creates the following tables:

1. `users` - User accounts with authentication data
2. `roles` - User roles (admin, user, etc.)
3. `permissions` - Granular permissions for actions
4. `user_roles` - Junction table for user-role assignments
5. `role_permissions` - Junction table for role-permission assignments
6. `tokens` - JWT tokens for auth sessions
7. `password_reset_tokens` - Tokens for password reset flows
8. `user_profiles` - Extended user profile information
9. `user_preferences` - User settings and preferences
10. `user_connections` - User relationships (follows, friends, etc.)

## Default Data

The migration automatically creates:

- Default roles: admin, user, moderator
- Basic permissions for users and roles
- Permission assignments for the admin role

## Authentication Features

This database structure supports:

1. **User Registration & Login**: Basic account creation and login
2. **Role-Based Access Control**: Assign roles with predefined permissions
3. **Permission Management**: Granular permission control per resource/action
4. **Multi-Factor Authentication**: Support for 2FA/MFA
5. **Password Reset**: Secure password reset flow
6. **Email Verification**: Email confirmation process
7. **Session Management**: Track and manage user sessions
8. **User Profiles**: Extended user information
9. **User Preferences**: User-specific settings
10. **Social Features**: Follow/friend relationships between users

## Migration Format

Migrations use [node-pg-migrate](https://github.com/salsita/node-pg-migrate) for schema management.

Each migration contains:

- `up()` function: Actions to perform when migrating forward
- `down()` function: Actions to perform when rolling back

## Customizing the Schema

If you need to modify the auth schema:

1. Create a new migration file
2. Add columns, constraints, or indexes as needed
3. Run the migration

Example of adding a column:

```typescript
// In a new migration file
export function up(pgm: MigrationBuilder): void {
  pgm.addColumn("users", {
    custom_field: { type: "text" },
  });
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropColumn("users", "custom_field");
}
```
