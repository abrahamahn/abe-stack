-- Seed data for social features (follows, posts, comments, likes)

-- Seed follows
INSERT INTO follows (
  id,
  follower_id, 
  followed_id, 
  is_accepted,
  is_notification_enabled,
  created_at, 
  updated_at
)
VALUES
  (
    uuid_generate_v4(),
    '22222222-2222-2222-2222-222222222222', 
    '33333333-3333-3333-3333-333333333333', 
    TRUE,
    TRUE,
    NOW() - INTERVAL '30 day', 
    NOW() - INTERVAL '30 day'
  ),
  (
    uuid_generate_v4(),
    '33333333-3333-3333-3333-333333333333', 
    '22222222-2222-2222-2222-222222222222', 
    TRUE,
    TRUE,
    NOW() - INTERVAL '28 day', 
    NOW() - INTERVAL '28 day'
  ),
  (
    uuid_generate_v4(),
    '22222222-2222-2222-2222-222222222222', 
    '44444444-4444-4444-4444-444444444444', 
    TRUE,
    TRUE,
    NOW() - INTERVAL '20 day', 
    NOW() - INTERVAL '20 day'
  ),
  (
    uuid_generate_v4(),
    '44444444-4444-4444-4444-444444444444', 
    '33333333-3333-3333-3333-333333333333', 
    TRUE,
    TRUE,
    NOW() - INTERVAL '15 day', 
    NOW() - INTERVAL '15 day'
  ),
  (
    uuid_generate_v4(),
    '55555555-5555-5555-5555-555555555555', 
    '22222222-2222-2222-2222-222222222222', 
    TRUE,
    TRUE,
    NOW() - INTERVAL '10 day', 
    NOW() - INTERVAL '10 day'
  ),
  (
    uuid_generate_v4(),
    '11111111-1111-1111-1111-111111111111', 
    '33333333-3333-3333-3333-333333333333', 
    TRUE,
    TRUE,
    NOW() - INTERVAL '5 day', 
    NOW() - INTERVAL '5 day'
  );

-- Seed posts
INSERT INTO posts (
  id, 
  user_id, 
  content, 
  type, 
  status, 
  visibility, 
  like_count, 
  comment_count, 
  share_count, 
  view_count, 
  published_at, 
  created_at, 
  updated_at
)
VALUES
  (
    'aabbccdd-1111-2222-3333-444444444444', 
    '22222222-2222-2222-2222-222222222222', 
    'Just launched my new project! Check it out at example.com', 
    'post', 
    'published', 
    'public', 
    5, 
    3, 
    1, 
    25, 
    NOW() - INTERVAL '14 day', 
    NOW() - INTERVAL '14 day', 
    NOW() - INTERVAL '14 day'
  ),
  (
    'aabbccdd-2222-3333-4444-555555555555', 
    '33333333-3333-3333-3333-333333333333', 
    'Sharing my latest design work. Let me know what you think!', 
    'post', 
    'published', 
    'public', 
    12, 
    7, 
    3, 
    87, 
    NOW() - INTERVAL '10 day', 
    NOW() - INTERVAL '10 day', 
    NOW() - INTERVAL '10 day'
  ),
  (
    'aabbccdd-3333-4444-5555-666666666666', 
    '44444444-4444-4444-4444-444444444444', 
    'Just got back from an amazing trip to Japan. Will post photos soon!', 
    'post', 
    'published', 
    'public', 
    28, 
    15, 
    5, 
    134, 
    NOW() - INTERVAL '7 day', 
    NOW() - INTERVAL '7 day', 
    NOW() - INTERVAL '7 day'
  ),
  (
    'aabbccdd-4444-5555-6666-777777777777', 
    '22222222-2222-2222-2222-222222222222', 
    'Working on a new coding tutorial series. Stay tuned!', 
    'post', 
    'published', 
    'public', 
    9, 
    4, 
    2, 
    56, 
    NOW() - INTERVAL '5 day', 
    NOW() - INTERVAL '5 day', 
    NOW() - INTERVAL '5 day'
  ),
  (
    'aabbccdd-5555-6666-7777-888888888888', 
    '33333333-3333-3333-3333-333333333333', 
    'Here\'s my take on the latest design trends for 2023', 
    'post', 
    'published', 
    'public', 
    17, 
    8, 
    4, 
    95, 
    NOW() - INTERVAL '3 day', 
    NOW() - INTERVAL '3 day', 
    NOW() - INTERVAL '3 day'
  ),
  (
    'aabbccdd-6666-7777-8888-999999999999', 
    '44444444-4444-4444-4444-444444444444', 
    'Excited to announce that I\'ll be speaking at TechConf next month!', 
    'post', 
    'published', 
    'public', 
    31, 
    12, 
    6, 
    142, 
    NOW() - INTERVAL '1 day', 
    NOW() - INTERVAL '1 day', 
    NOW() - INTERVAL '1 day'
  ),
  (
    'aabbccdd-7777-8888-9999-000000000000', 
    '55555555-5555-5555-5555-555555555555', 
    'Community Guidelines Update: Please review our updated community standards on content moderation.', 
    'announcement', 
    'published', 
    'public', 
    14, 
    6, 
    2, 
    205, 
    NOW() - INTERVAL '2 day', 
    NOW() - INTERVAL '2 day', 
    NOW() - INTERVAL '2 day'
  );

-- Seed comments on posts
INSERT INTO comments (
  id, 
  user_id, 
  target_id, 
  target_type, 
  parent_id, 
  content, 
  like_count, 
  reply_count,
  created_at, 
  updated_at
)
VALUES
  (
    'cccc1111-1111-1111-1111-111111111111', 
    '33333333-3333-3333-3333-333333333333', 
    'aabbccdd-1111-2222-3333-444444444444', 
    'post', 
    NULL, 
    'This looks amazing! Can\'t wait to try it out.', 
    2, 
    1,
    NOW() - INTERVAL '13 day', 
    NOW() - INTERVAL '13 day'
  ),
  (
    'cccc2222-2222-2222-2222-222222222222', 
    '44444444-4444-4444-4444-444444444444', 
    'aabbccdd-1111-2222-3333-444444444444', 
    'post', 
    NULL, 
    'Great work! Is this open source?', 
    1, 
    1,
    NOW() - INTERVAL '12 day', 
    NOW() - INTERVAL '12 day'
  ),
  (
    'cccc3333-3333-3333-3333-333333333333', 
    '22222222-2222-2222-2222-222222222222', 
    'aabbccdd-1111-2222-3333-444444444444', 
    'post', 
    'cccc2222-2222-2222-2222-222222222222', 
    'Thanks! Yes, it\'s available on GitHub.', 
    3, 
    0,
    NOW() - INTERVAL '12 day', 
    NOW() - INTERVAL '12 day'
  ),
  (
    'cccc4444-4444-4444-4444-444444444444', 
    '22222222-2222-2222-2222-222222222222', 
    'aabbccdd-2222-3333-4444-555555555555', 
    'post', 
    NULL, 
    'These designs are incredible! What tools do you use?', 
    4, 
    1,
    NOW() - INTERVAL '9 day', 
    NOW() - INTERVAL '9 day'
  ),
  (
    'cccc5555-5555-5555-5555-555555555555', 
    '33333333-3333-3333-3333-333333333333', 
    'aabbccdd-2222-3333-4444-555555555555', 
    'post', 
    'cccc4444-4444-4444-4444-444444444444', 
    'Thanks! I use Figma and Adobe Creative Suite.', 
    2, 
    0,
    NOW() - INTERVAL '9 day', 
    NOW() - INTERVAL '9 day'
  ),
  (
    'cccc6666-6666-6666-6666-666666666666', 
    '33333333-3333-3333-3333-333333333333', 
    'aabbccdd-3333-4444-5555-666666666666', 
    'post', 
    NULL, 
    'Can\'t wait to see the photos! Which cities did you visit?', 
    3, 
    1,
    NOW() - INTERVAL '6 day', 
    NOW() - INTERVAL '6 day'
  ),
  (
    'cccc7777-7777-7777-7777-777777777777', 
    '44444444-4444-4444-4444-444444444444', 
    'aabbccdd-3333-4444-5555-666666666666', 
    'post', 
    'cccc6666-6666-6666-6666-666666666666', 
    'Tokyo, Kyoto, and Osaka! Each one was amazing in its own way.', 
    5, 
    0,
    NOW() - INTERVAL '6 day', 
    NOW() - INTERVAL '6 day'
  ),
  (
    'cccc8888-8888-8888-8888-888888888888', 
    '11111111-1111-1111-1111-111111111111', 
    'aabbccdd-7777-8888-9999-000000000000', 
    'post', 
    NULL, 
    'Thank you for the update. It\'s important to keep our community safe.', 
    7, 
    0,
    NOW() - INTERVAL '1 day', 
    NOW() - INTERVAL '1 day'
  );

-- Seed likes on posts
INSERT INTO likes (
  id,
  user_id, 
  target_id, 
  target_type, 
  created_at, 
  updated_at
)
VALUES
  (
    uuid_generate_v4(),
    '33333333-3333-3333-3333-333333333333', 
    'aabbccdd-1111-2222-3333-444444444444', 
    'post', 
    NOW() - INTERVAL '13 day', 
    NOW() - INTERVAL '13 day'
  ),
  (
    uuid_generate_v4(),
    '44444444-4444-4444-4444-444444444444', 
    'aabbccdd-1111-2222-3333-444444444444', 
    'post', 
    NOW() - INTERVAL '12 day', 
    NOW() - INTERVAL '12 day'
  ),
  (
    uuid_generate_v4(),
    '55555555-5555-5555-5555-555555555555', 
    'aabbccdd-1111-2222-3333-444444444444', 
    'post', 
    NOW() - INTERVAL '11 day', 
    NOW() - INTERVAL '11 day'
  ),
  (
    uuid_generate_v4(),
    '22222222-2222-2222-2222-222222222222', 
    'aabbccdd-2222-3333-4444-555555555555', 
    'post', 
    NOW() - INTERVAL '9 day', 
    NOW() - INTERVAL '9 day'
  ),
  (
    uuid_generate_v4(),
    '44444444-4444-4444-4444-444444444444', 
    'aabbccdd-2222-3333-4444-555555555555', 
    'post', 
    NOW() - INTERVAL '8 day', 
    NOW() - INTERVAL '8 day'
  ),
  (
    uuid_generate_v4(),
    '22222222-2222-2222-2222-222222222222', 
    'aabbccdd-3333-4444-5555-666666666666', 
    'post', 
    NOW() - INTERVAL '6 day', 
    NOW() - INTERVAL '6 day'
  ),
  (
    uuid_generate_v4(),
    '33333333-3333-3333-3333-333333333333', 
    'aabbccdd-3333-4444-5555-666666666666', 
    'post', 
    NOW() - INTERVAL '5 day', 
    NOW() - INTERVAL '5 day'
  ),
  (
    uuid_generate_v4(),
    '11111111-1111-1111-1111-111111111111', 
    'aabbccdd-7777-8888-9999-000000000000', 
    'post', 
    NOW() - INTERVAL '1 day', 
    NOW() - INTERVAL '1 day'
  ),
  (
    uuid_generate_v4(),
    '22222222-2222-2222-2222-222222222222', 
    'aabbccdd-7777-8888-9999-000000000000', 
    'post', 
    NOW() - INTERVAL '1 day', 
    NOW() - INTERVAL '1 day'
  );

-- Seed comment likes
INSERT INTO comment_likes (
  id,
  user_id, 
  comment_id, 
  created_at, 
  updated_at
)
VALUES
  (
    uuid_generate_v4(),
    '22222222-2222-2222-2222-222222222222', 
    'cccc1111-1111-1111-1111-111111111111', 
    NOW() - INTERVAL '12 day', 
    NOW() - INTERVAL '12 day'
  ),
  (
    uuid_generate_v4(),
    '55555555-5555-5555-5555-555555555555', 
    'cccc1111-1111-1111-1111-111111111111', 
    NOW() - INTERVAL '11 day', 
    NOW() - INTERVAL '11 day'
  ),
  (
    uuid_generate_v4(),
    '33333333-3333-3333-3333-333333333333', 
    'cccc2222-2222-2222-2222-222222222222', 
    NOW() - INTERVAL '11 day', 
    NOW() - INTERVAL '11 day'
  ),
  (
    uuid_generate_v4(),
    '44444444-4444-4444-4444-444444444444', 
    'cccc3333-3333-3333-3333-333333333333', 
    NOW() - INTERVAL '11 day', 
    NOW() - INTERVAL '11 day'
  ),
  (
    uuid_generate_v4(),
    '55555555-5555-5555-5555-555555555555', 
    'cccc3333-3333-3333-3333-333333333333', 
    NOW() - INTERVAL '11 day', 
    NOW() - INTERVAL '11 day'
  ),
  (
    uuid_generate_v4(),
    '11111111-1111-1111-1111-111111111111', 
    'cccc3333-3333-3333-3333-333333333333', 
    NOW() - INTERVAL '10 day', 
    NOW() - INTERVAL '10 day'
  ),
  (
    uuid_generate_v4(),
    '33333333-3333-3333-3333-333333333333', 
    'cccc4444-4444-4444-4444-444444444444', 
    NOW() - INTERVAL '8 day', 
    NOW() - INTERVAL '8 day'
  );

-- Seed hashtags
INSERT INTO hashtags (
  id,
  tag, 
  normalized_tag, 
  usage_count, 
  is_trending, 
  recent_usage_count, 
  category, 
  created_at, 
  updated_at
)
VALUES
  (
    uuid_generate_v4(),
    'coding', 
    'coding', 
    42, 
    TRUE, 
    15, 
    'technology', 
    NOW() - INTERVAL '60 day', 
    NOW() - INTERVAL '1 day'
  ),
  (
    uuid_generate_v4(),
    'webdev', 
    'webdev', 
    78, 
    TRUE, 
    28, 
    'technology', 
    NOW() - INTERVAL '90 day', 
    NOW() - INTERVAL '1 day'
  ),
  (
    uuid_generate_v4(),
    'design', 
    'design', 
    56, 
    TRUE, 
    20, 
    'creative', 
    NOW() - INTERVAL '45 day', 
    NOW() - INTERVAL '1 day'
  ),
  (
    uuid_generate_v4(),
    'travel', 
    'travel', 
    92, 
    TRUE, 
    34, 
    'lifestyle', 
    NOW() - INTERVAL '120 day', 
    NOW() - INTERVAL '1 day'
  ),
  (
    uuid_generate_v4(),
    'japan', 
    'japan', 
    38, 
    TRUE, 
    12, 
    'travel', 
    NOW() - INTERVAL '30 day', 
    NOW() - INTERVAL '1 day'
  ),
  (
    uuid_generate_v4(),
    'photography', 
    'photography', 
    67, 
    TRUE, 
    19, 
    'creative', 
    NOW() - INTERVAL '75 day', 
    NOW() - INTERVAL '1 day'
  );