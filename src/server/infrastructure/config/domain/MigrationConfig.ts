import path from "path";

export interface MigrationConfig {
  migrations_path: string;
  migrations_table: string;
  migration_file_extension: string;
  migration_template_path?: string;
}

export const migrationConfig: MigrationConfig = {
  migrations_path: path.join(
    process.cwd(),
    "src/server/database/migrations/migrations",
  ),
  migrations_table: "migrations",
  migration_file_extension: ".ts", // Support for TypeScript migrations
};

export const createMigrationTemplate = (name: string): string => `
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

// Migration: ${name}
// Created: ${new Date().toISOString()}

export function up(pgm: MigrationBuilder): void {
  // Add migration code here
  // Examples:
  // pgm.createTable('table_name', {
  //   id: 'id',
  //   name: { type: 'varchar(1000)', notNull: true },
  //   created_at: {
  //     type: 'timestamp',
  //     notNull: true,
  //     default: pgm.func('current_timestamp'),
  //   },
  // });
  // pgm.createIndex('table_name', 'name');
}

export function down(pgm: MigrationBuilder): void {
  // Add rollback code here
  // Examples:
  // pgm.dropTable('table_name');
}
`;

// Auth migration template for creating authentication-related tables
export const createAuthMigrationTemplate = (): string => `
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

// Migration: Auth System Tables
// Created: ${new Date().toISOString()}

export function up(pgm: MigrationBuilder): void {
  // Enable UUID extension if not already enabled
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  // Create users table
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    username: { type: 'varchar(100)', notNull: true, unique: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password: { type: 'text', notNull: true },
    role: { type: 'varchar(50)', notNull: true, default: 'user' },
    is_verified: { type: 'boolean', notNull: true, default: false },
    email_confirmed: { type: 'boolean', notNull: true, default: false },
    email_token: { type: 'text' },
    email_token_expire: { type: 'timestamp' },
    last_email_sent: { type: 'timestamp' },
    type: { type: 'varchar(20)', notNull: true, default: 'standard' },
    last_login_at: { type: 'timestamp' },
    account_status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    failed_login_attempts: { type: 'integer', notNull: true, default: 0 },
    password_last_changed: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') }
  });

  // Create roles table
  pgm.createTable('roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(50)', notNull: true, unique: true },
    description: { type: 'text' },
    inherits_from: { type: 'uuid', references: 'roles(id)' },
    is_system: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') }
  });

  // Create permissions table
  pgm.createTable('permissions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    resource: { type: 'varchar(100)', notNull: true },
    action: { type: 'varchar(100)', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') }
  });
  pgm.createConstraint('permissions', 'permissions_resource_action_unique', {
    unique: ['resource', 'action']
  });

  // Create user_roles junction table
  pgm.createTable('user_roles', {
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: 'roles(id)', onDelete: 'CASCADE' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') }
  });
  pgm.addConstraint('user_roles', 'user_roles_pkey', { 
    primaryKey: ['user_id', 'role_id'] 
  });

  // Create role_permissions junction table
  pgm.createTable('role_permissions', {
    role_id: { type: 'uuid', notNull: true, references: 'roles(id)', onDelete: 'CASCADE' },
    permission_id: { type: 'uuid', notNull: true, references: 'permissions(id)', onDelete: 'CASCADE' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') }
  });
  pgm.addConstraint('role_permissions', 'role_permissions_pkey', { 
    primaryKey: ['role_id', 'permission_id'] 
  });

  // Create tokens table
  pgm.createTable('tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    token: { type: 'text', notNull: true, unique: true },
    type: { type: 'varchar(50)', notNull: true },
    device_info: { type: 'jsonb' },
    ip_address: { type: 'varchar(45)' },
    expires_at: { type: 'timestamp', notNull: true },
    last_used_at: { type: 'timestamp' },
    revoked: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') }
  });
  pgm.createIndex('tokens', 'token');
  pgm.createIndex('tokens', 'user_id');

  // Create password_reset_tokens table
  pgm.createTable('password_reset_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    token: { type: 'text', notNull: true, unique: true },
    expires_at: { type: 'timestamp', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    used_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') }
  });
  pgm.createIndex('password_reset_tokens', 'token');
  pgm.createIndex('password_reset_tokens', 'user_id');

  // Create user_profiles table
  pgm.createTable('user_profiles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE', unique: true },
    display_name: { type: 'varchar(100)' },
    first_name: { type: 'varchar(100)' },
    last_name: { type: 'varchar(100)' },
    bio: { type: 'text' },
    profile_image: { type: 'text' },
    banner_image: { type: 'text' },
    location: { type: 'varchar(100)' },
    website: { type: 'text' },
    social_links: { type: 'jsonb', default: '{}' },
    interests: { type: 'text[]', default: '{}' },
    skills: { type: 'text[]', default: '{}' },
    occupation: { type: 'varchar(100)' },
    education: { type: 'text' },
    birthday: { type: 'date' },
    phone_number: { type: 'varchar(20)' },
    last_profile_update: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    profile_completion_percentage: { type: 'integer', notNull: true, default: 0 },
    is_public: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') }
  });
  pgm.createIndex('user_profiles', 'user_id');

  // Create user_preferences table
  pgm.createTable('user_preferences', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE', unique: true },
    notifications: { type: 'jsonb', notNull: true, default: '{"emailNotifications":true,"pushNotifications":true}' },
    privacy: { type: 'jsonb', notNull: true, default: '{"profileVisibility":"public"}' },
    theme: { type: 'jsonb', notNull: true, default: '{"theme":"system"}' },
    accessibility: { type: 'jsonb', notNull: true, default: '{}' },
    language: { type: 'varchar(10)', notNull: true, default: 'en' },
    timezone: { type: 'varchar(50)', notNull: true, default: 'UTC' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') }
  });
  pgm.createIndex('user_preferences', 'user_id');

  // Create user_connections table
  pgm.createTable('user_connections', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    target_user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    type: { type: 'varchar(20)', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') }
  });
  pgm.addConstraint('user_connections', 'user_connections_unique', {
    unique: ['user_id', 'target_user_id', 'type']
  });
  pgm.createIndex('user_connections', 'user_id');
  pgm.createIndex('user_connections', 'target_user_id');
  pgm.createIndex('user_connections', 'type');
  
  // Create default roles and permissions
  pgm.sql(\`
    -- Insert default roles
    INSERT INTO roles (name, description, is_system) 
    VALUES ('admin', 'Administrator with full system access', true),
           ('user', 'Regular application user', true),
           ('moderator', 'User with moderation privileges', true);
           
    -- Insert default permissions
    INSERT INTO permissions (name, resource, action, is_system)
    VALUES ('Manage Users', 'user', 'manage', true),
           ('Read Users', 'user', 'read', true),
           ('Create Users', 'user', 'create', true),
           ('Update Users', 'user', 'update', true),
           ('Delete Users', 'user', 'delete', true),
           ('Manage Roles', 'role', 'manage', true),
           ('Read Roles', 'role', 'read', true),
           ('Create Roles', 'role', 'create', true),
           ('Update Roles', 'role', 'update', true),
           ('Delete Roles', 'role', 'delete', true),
           ('Manage Permissions', 'permission', 'manage', true),
           ('Read Permissions', 'permission', 'read', true);
           
    -- Assign permissions to admin role
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT 
      (SELECT id FROM roles WHERE name = 'admin'), 
      id 
    FROM permissions;
    
    -- Assign basic permissions to user role
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT 
      (SELECT id FROM roles WHERE name = 'user'),
      id
    FROM permissions 
    WHERE resource = 'user' AND action = 'read';
  \`);
}

export function down(pgm: MigrationBuilder): void {
  // Drop all tables in reverse order (to handle dependencies)
  pgm.dropTable('user_connections');
  pgm.dropTable('user_preferences');
  pgm.dropTable('user_profiles');
  pgm.dropTable('password_reset_tokens');
  pgm.dropTable('tokens');
  pgm.dropTable('role_permissions');
  pgm.dropTable('user_roles');
  pgm.dropTable('permissions');
  pgm.dropTable('roles');
  pgm.dropTable('users');
  
  // Drop UUID extension if needed
  // pgm.dropExtension('uuid-ossp');
}
`;
