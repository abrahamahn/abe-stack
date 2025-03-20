-- Seed data for notifications and bookmarks

-- Seed notifications
INSERT INTO notifications (
  id,
  type,
  user_id,
  actor_id,
  entity_id,
  entity_type,
  content,
  read,
  delivered,
  created_at,
  updated_at
)
VALUES
  (
    uuid_generate_v4(),
    'LIKE',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'aabbccdd-1111-2222-3333-444444444444',
    'post',
    'Jane Smith liked your post',
    TRUE,
    TRUE,
    NOW() - INTERVAL '13 day',
    NOW() - INTERVAL '13 day'
  ),
  (
    uuid_generate_v4(),
    'COMMENT',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'cccc1111-1111-1111-1111-111111111111',
    'comment',
    'Jane Smith commented on your post: "This looks amazing! Can\'t wait to try it out."',
    TRUE,
    TRUE,
    NOW() - INTERVAL '13 day',
    NOW() - INTERVAL '13 day'
  ),
  (
    uuid_generate_v4(),
    'FOLLOW',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    NULL,
    NULL,
    'John Doe started following you',
    TRUE,
    TRUE,
    NOW() - INTERVAL '30 day',
    NOW() - INTERVAL '30 day'
  ),
  (
    uuid_generate_v4(),
    'COMMENT',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'cccc4444-4444-4444-4444-444444444444',
    'comment',
    'John Doe commented on your post: "These designs are incredible! What tools do you use?"',
    TRUE,
    TRUE,
    NOW() - INTERVAL '9 day',
    NOW() - INTERVAL '9 day'
  ),
  (
    uuid_generate_v4(),
    'MENTION',
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'aabbccdd-4444-5555-6666-777777777777',
    'post',
    'John Doe mentioned you in a post',
    TRUE,
    TRUE,
    NOW() - INTERVAL '5 day',
    NOW() - INTERVAL '5 day'
  ),
  (
    uuid_generate_v4(),
    'LIKE',
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'aabbccdd-3333-4444-5555-666666666666',
    'post',
    'John Doe liked your post',
    TRUE,
    TRUE,
    NOW() - INTERVAL '6 day',
    NOW() - INTERVAL '6 day'
  ),
  (
    uuid_generate_v4(),
    'SYSTEM',
    '33333333-3333-3333-3333-333333333333',
    NULL,
    'action11-1111-1111-1111-111111111111',
    'moderation_action',
    'Your comment has been flagged for promotional content. Please review our community guidelines.',
    TRUE,
    TRUE,
    NOW() - INTERVAL '6 hour',
    NOW() - INTERVAL '6 hour'
  ),
  (
    uuid_generate_v4(),
    'MESSAGE',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'msg44444-4444-4444-4444-444444444444',
    'message',
    'You have a new message from John Doe',
    FALSE,
    TRUE,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    uuid_generate_v4(),
    'LIKE',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    'aabbccdd-2222-3333-4444-555555555555',
    'post',
    'Sam Wilson liked your post',
    FALSE,
    TRUE,
    NOW() - INTERVAL '8 day',
    NOW() - INTERVAL '8 day'
  ),
  (
    uuid_generate_v4(),
    'FOLLOW',
    '44444444-4444-4444-4444-444444444444',
    '33333333-3333-3333-3333-333333333333',
    NULL,
    NULL,
    'Jane Smith started following you',
    FALSE,
    TRUE,
    NOW() - INTERVAL '15 day',
    NOW() - INTERVAL '15 day'
  );

-- Seed bookmarks
INSERT INTO bookmarks (
  id,
  user_id,
  entity_id,
  entity_type,
  notes,
  collection_id,
  created_at,
  updated_at
)
VALUES
  (
    uuid_generate_v4(),
    '22222222-2222-2222-2222-222222222222',
    'aabbccdd-2222-3333-4444-555555555555',
    'post',
    'Great design ideas to reference later',
    NULL,
    NOW() - INTERVAL '9 day',
    NOW() - INTERVAL '9 day'
  ),
  (
    uuid_generate_v4(),
    '33333333-3333-3333-3333-333333333333',
    'aabbccdd-4444-5555-6666-777777777777',
    'post',
    'Interesting coding tutorial series, check back for updates',
    NULL,
    NOW() - INTERVAL '4 day',
    NOW() - INTERVAL '4 day'
  ),
  (
    uuid_generate_v4(),
    '44444444-4444-4444-4444-444444444444',
    'aabbccdd-1111-2222-3333-444444444444',
    'post',
    'Interesting project, might be useful reference',
    NULL,
    NOW() - INTERVAL '10 day',
    NOW() - INTERVAL '10 day'
  ),
  (
    uuid_generate_v4(),
    '33333333-3333-3333-3333-333333333333',
    'media6666-6666-6666-6666-666666666666',
    'media',
    'Good code demo for learning',
    NULL,
    NOW() - INTERVAL '2 day',
    NOW() - INTERVAL '2 day'
  ),
  (
    uuid_generate_v4(),
    '44444444-4444-4444-4444-444444444444',
    'media2222-2222-2222-2222-222222222222',
    'media',
    'UI design inspiration',
    NULL,
    NOW() - INTERVAL '20 day',
    NOW() - INTERVAL '20 day'
  ),
  (
    uuid_generate_v4(),
    '22222222-2222-2222-2222-222222222222',
    'group222-2222-2222-2222-222222222222',
    'group',
    'Great design community to stay active in',
    NULL,
    NOW() - INTERVAL '38 day',
    NOW() - INTERVAL '38 day'
  );