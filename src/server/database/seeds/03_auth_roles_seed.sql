-- Seed data for roles, permissions and role assignments

-- Seed roles
INSERT INTO roles (id, name, description, created_at, updated_at)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    'admin', 
    'Administrator with full system access', 
    NOW(), 
    NOW()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    'moderator', 
    'Content moderator with permission to review and moderate content', 
    NOW(), 
    NOW()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 
    'user', 
    'Regular user with basic permissions', 
    NOW(), 
    NOW()
  );

-- Seed permissions
INSERT INTO permissions (id, name, description, resource, action, created_at, updated_at)
VALUES
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd', 
    'create_post', 
    'Create posts', 
    'post', 
    'create', 
    NOW(), 
    NOW()
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 
    'update_post', 
    'Update posts', 
    'post', 
    'update', 
    NOW(), 
    NOW()
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff', 
    'delete_post', 
    'Delete posts', 
    'post', 
    'delete', 
    NOW(), 
    NOW()
  ),
  (
    '11111111-aaaa-bbbb-cccc-dddddddddddd', 
    'moderate_content', 
    'Moderate user content', 
    'content', 
    'moderate', 
    NOW(), 
    NOW()
  ),
  (
    '22222222-aaaa-bbbb-cccc-dddddddddddd', 
    'manage_users', 
    'Manage user accounts', 
    'user', 
    'manage', 
    NOW(), 
    NOW()
  ),
  (
    '33333333-aaaa-bbbb-cccc-dddddddddddd', 
    'create_comment', 
    'Create comments', 
    'comment', 
    'create', 
    NOW(), 
    NOW()
  ),
  (
    '44444444-aaaa-bbbb-cccc-dddddddddddd', 
    'upload_media', 
    'Upload media files', 
    'media', 
    'create', 
    NOW(), 
    NOW()
  ),
  (
    '55555555-aaaa-bbbb-cccc-dddddddddddd', 
    'create_group', 
    'Create groups', 
    'group', 
    'create', 
    NOW(), 
    NOW()
  );

-- Seed role permissions (assign permissions to roles)
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
VALUES
  -- Admin has all permissions
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    'dddddddd-dddd-dddd-dddd-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 
    NOW(), 
    NOW()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    'ffffffff-ffff-ffff-ffff-ffffffffffff', 
    NOW(), 
    NOW()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    '11111111-aaaa-bbbb-cccc-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    '22222222-aaaa-bbbb-cccc-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    '33333333-aaaa-bbbb-cccc-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    '44444444-aaaa-bbbb-cccc-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    '55555555-aaaa-bbbb-cccc-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  
  -- Moderator permissions
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    'dddddddd-dddd-dddd-dddd-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 
    NOW(), 
    NOW()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    '11111111-aaaa-bbbb-cccc-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    '33333333-aaaa-bbbb-cccc-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    '44444444-aaaa-bbbb-cccc-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  
  -- Regular user permissions
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 
    'dddddddd-dddd-dddd-dddd-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 
    NOW(), 
    NOW()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 
    '33333333-aaaa-bbbb-cccc-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 
    '44444444-aaaa-bbbb-cccc-dddddddddddd', 
    NOW(), 
    NOW()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 
    '55555555-aaaa-bbbb-cccc-dddddddddddd', 
    NOW(), 
    NOW()
  );

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
VALUES
  -- Admin user gets admin role
  (
    '11111111-1111-1111-1111-111111111111', 
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    NOW(), 
    NOW()
  ),
  -- Moderator gets moderator role
  (
    '55555555-5555-5555-5555-555555555555', 
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    NOW(), 
    NOW()
  ),
  -- Regular users get user role
  (
    '22222222-2222-2222-2222-222222222222', 
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 
    NOW(), 
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333', 
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 
    NOW(), 
    NOW()
  ),
  (
    '44444444-4444-4444-4444-444444444444', 
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 
    NOW(), 
    NOW()
  );