-- Seed data for groups and group members

-- Seed groups
INSERT INTO groups (
  id,
  name,
  slug,
  description,
  image_url,
  banner_url,
  owner_id,
  visibility,
  status,
  rules,
  member_count,
  created_at,
  updated_at
)
VALUES
  (
    'group111-1111-1111-1111-111111111111',
    'Web Developers Network',
    'web-developers-network',
    'A community for web developers to share knowledge, resources, and opportunities.',
    '/images/groups/webdev.jpg',
    '/images/banners/webdev-banner.jpg',
    '22222222-2222-2222-2222-222222222222',
    'public',
    'active',
    '1. Be respectful and professional.
2. No spam or self-promotion.
3. Share valuable content related to web development.',
    3,
    NOW() - INTERVAL '45 day',
    NOW() - INTERVAL '45 day'
  ),
  (
    'group222-2222-2222-2222-222222222222',
    'UI/UX Design Community',
    'ui-ux-design-community',
    'A group for UI/UX designers to collaborate, share work, and get feedback.',
    '/images/groups/design.jpg',
    '/images/banners/design-banner.jpg',
    '33333333-3333-3333-3333-333333333333',
    'public',
    'active',
    '1. Be constructive when providing feedback.
2. Share your work and insights.
3. Respect intellectual property.',
    3,
    NOW() - INTERVAL '40 day',
    NOW() - INTERVAL '40 day'
  ),
  (
    'group333-3333-3333-3333-333333333333',
    'Travel Photography',
    'travel-photography',
    'Share your travel photography and get inspired for your next adventure.',
    '/images/groups/travel.jpg',
    '/images/banners/travel-banner.jpg',
    '44444444-4444-4444-4444-444444444444',
    'public',
    'active',
    '1. Only share your original photos.
2. Include location information when possible.
3. Be respectful of different cultures and viewpoints.',
    3,
    NOW() - INTERVAL '35 day',
    NOW() - INTERVAL '35 day'
  ),
  (
    'group444-4444-4444-4444-444444444444',
    'Platform Moderators',
    'platform-moderators',
    'Private group for platform moderators to coordinate content moderation efforts.',
    '/images/groups/mods.jpg',
    '/images/banners/mods-banner.jpg',
    '11111111-1111-1111-1111-111111111111',
    'private',
    'active',
    '1. All discussions in this group are confidential.
2. Follow the moderation guidelines.
3. Report any issues to admin immediately.',
    2,
    NOW() - INTERVAL '60 day',
    NOW() - INTERVAL '60 day'
  );

-- Seed group members
INSERT INTO group_members (
  id,
  group_id,
  user_id,
  role,
  status,
  notification_settings,
  last_activity,
  created_at,
  updated_at
)
VALUES
  (
    uuid_generate_v4(),
    'group111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'admin',
    'approved',
    '{"posts": true, "comments": true, "events": true}',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '45 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    uuid_generate_v4(),
    'group111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'member',
    'approved',
    '{"posts": true, "comments": true, "events": true}',
    NOW() - INTERVAL '2 day',
    NOW() - INTERVAL '40 day',
    NOW() - INTERVAL '2 day'
  ),
  (
    uuid_generate_v4(),
    'group111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'member',
    'approved',
    '{"posts": true, "comments": true, "events": false}',
    NOW() - INTERVAL '5 day',
    NOW() - INTERVAL '35 day',
    NOW() - INTERVAL '5 day'
  ),
  (
    uuid_generate_v4(),
    'group222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'admin',
    'approved',
    '{"posts": true, "comments": true, "events": true}',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '40 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    uuid_generate_v4(),
    'group222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'member',
    'approved',
    '{"posts": true, "comments": true, "events": true}',
    NOW() - INTERVAL '3 day',
    NOW() - INTERVAL '38 day',
    NOW() - INTERVAL '3 day'
  ),
  (
    uuid_generate_v4(),
    'group222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'member',
    'approved',
    '{"posts": true, "comments": false, "events": false}',
    NOW() - INTERVAL '10 day',
    NOW() - INTERVAL '32 day',
    NOW() - INTERVAL '10 day'
  ),
  (
    uuid_generate_v4(),
    'group333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    'admin',
    'approved',
    '{"posts": true, "comments": true, "events": true}',
    NOW() - INTERVAL '2 day',
    NOW() - INTERVAL '35 day',
    NOW() - INTERVAL '2 day'
  ),
  (
    uuid_generate_v4(),
    'group333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'member',
    'approved',
    '{"posts": true, "comments": true, "events": false}',
    NOW() - INTERVAL '4 day',
    NOW() - INTERVAL '30 day',
    NOW() - INTERVAL '4 day'
  ),
  (
    uuid_generate_v4(),
    'group333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'member',
    'approved',
    '{"posts": true, "comments": true, "events": true}',
    NOW() - INTERVAL '6 day',
    NOW() - INTERVAL '28 day',
    NOW() - INTERVAL '6 day'
  ),
  (
    uuid_generate_v4(),
    'group444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'admin',
    'approved',
    '{"posts": true, "comments": true, "events": true}',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '60 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    uuid_generate_v4(),
    'group444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    'moderator',
    'approved',
    '{"posts": true, "comments": true, "events": true}',
    NOW() - INTERVAL '2 day',
    NOW() - INTERVAL '58 day',
    NOW() - INTERVAL '2 day'
  );