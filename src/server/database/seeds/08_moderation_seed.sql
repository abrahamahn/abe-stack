-- Seed data for content moderation (reports and actions)

-- Seed content reports
INSERT INTO content_reports (
  id,
  reporter_id,
  content_id,
  content_type,
  content_owner_id,
  type,
  description,
  status,
  severity,
  reviewer_id,
  review_started_at,
  review_completed_at,
  review_notes,
  resolution,
  created_at,
  updated_at
)
VALUES
  (
    'report11-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'cccc6666-6666-6666-6666-666666666666', -- comment ID
    'comment',
    '33333333-3333-3333-3333-333333333333',
    'SPAM',
    'This comment contains irrelevant promotional content.',
    'resolved',
    'low',
    '55555555-5555-5555-5555-555555555555',
    NOW() - INTERVAL '7 hour',
    NOW() - INTERVAL '6 hour',
    'Reviewed the comment and found promotional content not related to the discussion.',
    'Comment warning issued. No removal needed, but added a note to the user.',
    NOW() - INTERVAL '8 hour',
    NOW() - INTERVAL '6 hour'
  ),
  (
    'report22-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'aabbccdd-6666-7777-8888-999999999999', -- post ID
    'post',
    '44444444-4444-4444-4444-444444444444',
    'COPYRIGHT',
    'This post contains copyrighted material that belongs to my company.',
    'pending',
    'medium',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NOW() - INTERVAL '4 hour',
    NOW() - INTERVAL '4 hour'
  ),
  (
    'report33-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    'media4444-4444-4444-4444-444444444444', -- media ID
    'media',
    '44444444-4444-4444-4444-444444444444',
    'OTHER',
    'I accidentally uploaded this video with personal information visible. Please remove it.',
    'resolved',
    'high',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '3 hour',
    NOW() - INTERVAL '2 hour',
    'Verified user identity and confirmed ownership of content.',
    'Media removed as requested by the owner.',
    NOW() - INTERVAL '4 hour',
    NOW() - INTERVAL '2 hour'
  ),
  (
    'report44-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'msga9999-9999-9999-9999-999999999999', -- message ID
    'message',
    '11111111-1111-1111-1111-111111111111',
    'HARASSMENT',
    'This message contains targeted harassment.',
    'in_review',
    'critical',
    '55555555-5555-5555-5555-555555555555',
    NOW() - INTERVAL '1 hour',
    NULL,
    'Investigating the report and reviewing message content.',
    NULL,
    NOW() - INTERVAL '2 hour',
    NOW() - INTERVAL '1 hour'
  );

-- Seed moderation actions
INSERT INTO moderation_actions (
  id,
  moderator_id,
  target_user_id,
  content_id,
  content_type,
  report_id,
  type,
  reason,
  status,
  action_details,
  created_at,
  updated_at
)
VALUES
  (
    'action11-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    'cccc6666-6666-6666-6666-666666666666',
    'comment',
    'report11-1111-1111-1111-111111111111',
    'WARNING',
    'Promotional content in comments violates community guidelines.',
    'APPLIED',
    '{"warningMessage": "Please refrain from posting promotional content in comments.", "visibleToUser": true}',
    NOW() - INTERVAL '6 hour',
    NOW() - INTERVAL '6 hour'
  ),
  (
    'action22-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'media4444-4444-4444-4444-444444444444',
    'media',
    'report33-3333-3333-3333-333333333333',
    'CONTENT_REMOVAL',
    'Content removed at owner\'s request due to personal information.',
    'APPLIED',
    '{"removalNote": "Media removed at your request due to personal information exposure.", "visibleToUser": true, "permanentRemoval": true}',
    NOW() - INTERVAL '2 hour',
    NOW() - INTERVAL '2 hour'
  );

-- Seed activity logs
INSERT INTO activity_logs (
  id,
  user_id,
  type,
  target_id,
  target_type,
  metadata,
  ip_address,
  user_agent,
  created_at
)
VALUES
  (
    uuid_generate_v4(),
    '22222222-2222-2222-2222-222222222222',
    'USER_LOGIN',
    NULL,
    NULL,
    '{"device": "desktop", "browser": "Chrome"}',
    '192.168.1.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    NOW() - INTERVAL '1 day'
  ),
  (
    uuid_generate_v4(),
    '33333333-3333-3333-3333-333333333333',
    'POST_CREATED',
    'aabbccdd-2222-3333-4444-555555555555',
    'post',
    '{"postType": "standard"}',
    '192.168.1.2',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    NOW() - INTERVAL '10 day'
  ),
  (
    uuid_generate_v4(),
    '44444444-4444-4444-4444-444444444444',
    'MEDIA_UPLOADED',
    'media3333-3333-3333-3333-333333333333',
    'media',
    '{"mediaType": "image", "fileSize": 3456789}',
    '192.168.1.3',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    NOW() - INTERVAL '15 day'
  ),
  (
    uuid_generate_v4(),
    '11111111-1111-1111-1111-111111111111',
    'USER_LOGIN',
    NULL,
    NULL,
    '{"device": "desktop", "browser": "Firefox"}',
    '192.168.1.4',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
    NOW() - INTERVAL '2 day'
  ),
  (
    uuid_generate_v4(),
    '55555555-5555-5555-5555-555555555555',
    'NOTIFICATION_CLICKED',
    'action11-1111-1111-1111-111111111111',
    'moderation_action',
    '{"notificationType": "system"}',
    '192.168.1.5',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    NOW() - INTERVAL '6 hour'
  ),
  (
    uuid_generate_v4(),
    '33333333-3333-3333-3333-333333333333',
    'POST_LIKED',
    'aabbccdd-3333-4444-5555-666666666666',
    'post',
    '{}',
    '192.168.1.2',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    NOW() - INTERVAL '5 day'
  ),
  (
    uuid_generate_v4(),
    '44444444-4444-4444-4444-444444444444',
    'GROUP_JOINED',
    'group222-2222-2222-2222-222222222222',
    'group',
    '{"role": "member"}',
    '192.168.1.3',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    NOW() - INTERVAL '32 day'
  ),
  (
    uuid_generate_v4(),
    '22222222-2222-2222-2222-222222222222',
    'SEARCH_PERFORMED',
    NULL,
    NULL,
    '{"query": "javascript tutorial", "resultCount": 24}',
    '192.168.1.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    NOW() - INTERVAL '3 day'
  );