-- Seed data for messaging (conversations and messages)

-- Seed conversations
INSERT INTO conversations (
  id,
  title,
  type,
  participant_ids,
  creator_id,
  status,
  is_encrypted,
  created_at,
  updated_at
)
VALUES
  (
    'conv1111-1111-1111-1111-111111111111',
    NULL,
    'direct',
    ARRAY['22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'],
    '22222222-2222-2222-2222-222222222222',
    'active',
    FALSE,
    NOW() - INTERVAL '20 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    'conv2222-2222-2222-2222-222222222222',
    NULL,
    'direct',
    ARRAY['22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444'],
    '44444444-4444-4444-4444-444444444444',
    'active',
    FALSE,
    NOW() - INTERVAL '15 day',
    NOW() - INTERVAL '2 day'
  ),
  (
    'conv3333-3333-3333-3333-333333333333',
    'Project Collaboration',
    'group',
    ARRAY['22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'],
    '22222222-2222-2222-2222-222222222222',
    'active',
    FALSE,
    NOW() - INTERVAL '10 day',
    NOW() - INTERVAL '3 day'
  ),
  (
    'conv4444-4444-4444-4444-444444444444',
    NULL,
    'direct',
    ARRAY['33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'],
    '33333333-3333-3333-3333-333333333333',
    'active',
    FALSE,
    NOW() - INTERVAL '8 day',
    NOW() - INTERVAL '4 day'
  ),
  (
    'conv5555-5555-5555-5555-555555555555',
    'Content Moderation Team',
    'group',
    ARRAY['11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222'],
    '11111111-1111-1111-1111-111111111111',
    'active',
    FALSE,
    NOW() - INTERVAL '30 day',
    NOW() - INTERVAL '2 day'
  );

-- Seed messages
INSERT INTO messages (
  id,
  conversation_id,
  sender_id,
  content,
  type,
  status,
  sent_at,
  created_at,
  updated_at
)
VALUES
  (
    'msg11111-1111-1111-1111-111111111111',
    'conv1111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'Hey Jane, how''s your design project coming along?',
    'text',
    'sent',
    NOW() - INTERVAL '19 day',
    NOW() - INTERVAL '19 day',
    NOW() - INTERVAL '19 day'
  ),
  (
    'msg22222-2222-2222-2222-222222222222',
    'conv1111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Going well! I''m almost done with the UI mockups. Will share them soon!',
    'text',
    'sent',
    NOW() - INTERVAL '19 day',
    NOW() - INTERVAL '19 day',
    NOW() - INTERVAL '19 day'
  ),
  (
    'msg33333-3333-3333-3333-333333333333',
    'conv1111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'Great! Looking forward to seeing them.',
    'text',
    'sent',
    NOW() - INTERVAL '19 day',
    NOW() - INTERVAL '19 day',
    NOW() - INTERVAL '19 day'
  ),
  (
    'msg44444-4444-4444-4444-444444444444',
    'conv1111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Just finished the mockups! Check them out!',
    'text',
    'sent',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    'msg55555-5555-5555-5555-555555555555',
    'conv2222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'John, I''m planning a photography trip. Any gear recommendations?',
    'text',
    'sent',
    NOW() - INTERVAL '15 day',
    NOW() - INTERVAL '15 day',
    NOW() - INTERVAL '15 day'
  ),
  (
    'msg66666-6666-6666-6666-666666666666',
    'conv2222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'Definitely! For travel, I''d recommend a lightweight mirrorless camera.',
    'text',
    'sent',
    NOW() - INTERVAL '15 day',
    NOW() - INTERVAL '15 day',
    NOW() - INTERVAL '15 day'
  ),
  (
    'msg77777-7777-7777-7777-777777777777',
    'conv2222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'Any specific brands you''d suggest?',
    'text',
    'sent',
    NOW() - INTERVAL '15 day',
    NOW() - INTERVAL '15 day',
    NOW() - INTERVAL '15 day'
  ),
  (
    'msg88888-8888-8888-8888-888888888888',
    'conv2222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'Sony Alpha or Fujifilm X series are both excellent choices.',
    'text',
    'sent',
    NOW() - INTERVAL '15 day',
    NOW() - INTERVAL '15 day',
    NOW() - INTERVAL '15 day'
  ),
  (
    'msg99999-9999-9999-9999-999999999999',
    'conv2222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'Thanks! I''ll check those out.',
    'text',
    'sent',
    NOW() - INTERVAL '14 day',
    NOW() - INTERVAL '14 day',
    NOW() - INTERVAL '14 day'
  ),
  (
    'msg00000-0000-0000-0000-000000000000',
    'conv2222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'I got the Sony Alpha! Here''s a sample shot from my backyard.',
    'text',
    'sent',
    NOW() - INTERVAL '2 day',
    NOW() - INTERVAL '2 day',
    NOW() - INTERVAL '2 day'
  ),
  (
    'msga1111-1111-1111-1111-111111111111',
    'conv3333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'I''ve created this group for our collaboration on the new project.',
    'text',
    'sent',
    NOW() - INTERVAL '10 day',
    NOW() - INTERVAL '10 day',
    NOW() - INTERVAL '10 day'
  ),
  (
    'msga2222-2222-2222-2222-222222222222',
    'conv3333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'Great idea! I''ll handle the design part.',
    'text',
    'sent',
    NOW() - INTERVAL '10 day',
    NOW() - INTERVAL '10 day',
    NOW() - INTERVAL '10 day'
  ),
  (
    'msga3333-3333-3333-3333-333333333333',
    'conv3333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    'And I''ll take care of the photography and visual content.',
    'text',
    'sent',
    NOW() - INTERVAL '10 day',
    NOW() - INTERVAL '10 day',
    NOW() - INTERVAL '10 day'
  ),
  (
    'msga4444-4444-4444-4444-444444444444',
    'conv3333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'Perfect! Let''s meet tomorrow to discuss the details.',
    'text',
    'sent',
    NOW() - INTERVAL '9 day',
    NOW() - INTERVAL '9 day',
    NOW() - INTERVAL '9 day'
  ),
  (
    'msga5555-5555-5555-5555-555555555555',
    'conv3333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'I''ve started working on some initial mockups. Will share by tomorrow.',
    'text',
    'sent',
    NOW() - INTERVAL '3 day',
    NOW() - INTERVAL '3 day',
    NOW() - INTERVAL '3 day'
  ),
  (
    'msga6666-6666-6666-6666-666666666666',
    'conv5555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'We need to update our content moderation guidelines. Any suggestions?',
    'text',
    'sent',
    NOW() - INTERVAL '30 day',
    NOW() - INTERVAL '30 day',
    NOW() - INTERVAL '30 day'
  ),
  (
    'msga7777-7777-7777-7777-777777777777',
    'conv5555-5555-5555-5555-555555555555',
    '55555555-5555-5555-5555-555555555555',
    'I think we should focus on clarifying the hate speech policies.',
    'text',
    'sent',
    NOW() - INTERVAL '29 day',
    NOW() - INTERVAL '29 day',
    NOW() - INTERVAL '29 day'
  ),
  (
    'msga8888-8888-8888-8888-888888888888',
    'conv5555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'From a user perspective, I think clearer examples would help.',
    'text',
    'sent',
    NOW() - INTERVAL '28 day',
    NOW() - INTERVAL '28 day',
    NOW() - INTERVAL '28 day'
  ),
  (
    'msga9999-9999-9999-9999-999999999999',
    'conv5555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'Good points. I''ll draft an update with both of those suggestions.',
    'text',
    'sent',
    NOW() - INTERVAL '27 day',
    NOW() - INTERVAL '27 day',
    NOW() - INTERVAL '27 day'
  ),
  (
    'msgb1111-1111-1111-1111-111111111111',
    'conv5555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'The updated guidelines are now live. Thanks for your input!',
    'text',
    'sent',
    NOW() - INTERVAL '2 day',
    NOW() - INTERVAL '2 day',
    NOW() - INTERVAL '2 day'
  );

-- Update conversations with last message information
UPDATE conversations 
SET 
  last_message_id = 'msg44444-4444-4444-4444-444444444444',
  last_message_sent_at = NOW() - INTERVAL '1 day'
WHERE id = 'conv1111-1111-1111-1111-111111111111';

UPDATE conversations 
SET 
  last_message_id = 'msg00000-0000-0000-0000-000000000000',
  last_message_sent_at = NOW() - INTERVAL '2 day'
WHERE id = 'conv2222-2222-2222-2222-222222222222';

UPDATE conversations 
SET 
  last_message_id = 'msga5555-5555-5555-5555-555555555555',
  last_message_sent_at = NOW() - INTERVAL '3 day'
WHERE id = 'conv3333-3333-3333-3333-333333333333';

UPDATE conversations 
SET 
  last_message_id = 'msgb1111-1111-1111-1111-111111111111',
  last_message_sent_at = NOW() - INTERVAL '2 day'
WHERE id = 'conv5555-5555-5555-5555-555555555555';