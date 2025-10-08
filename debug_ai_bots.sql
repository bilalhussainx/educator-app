-- Debug AI Bots - Check current state
SELECT 'AI Bots Count' as check_type, COUNT(*) as count FROM ai_bots;

SELECT 'AI Bot Details' as check_type, bot_name, specialization_focus, is_active FROM ai_bots;

SELECT 'User Profiles for AI Bots' as check_type, up.display_name, up.is_mentor, up.is_searchable_teacher 
FROM ai_bots ab 
JOIN user_profiles up ON ab.user_id = up.user_id;

-- Try to insert AI bots if they don't exist (using a different approach)
INSERT INTO ai_bots (user_id, bot_name, personality_type, specialization_focus, system_prompt) 
SELECT 
    (SELECT id FROM users LIMIT 1), -- Use first available user ID
    'Alex Chen', 
    'Encouraging Mentor', 
    'Programming & Software Development',
    'You are Alex Chen, an encouraging AI programming mentor.'
WHERE NOT EXISTS (SELECT 1 FROM ai_bots WHERE bot_name = 'Alex Chen');

INSERT INTO ai_bots (user_id, bot_name, personality_type, specialization_focus, system_prompt) 
SELECT 
    (SELECT id FROM users LIMIT 1),
    'Sarah Kim',
    'Patient Tutor', 
    'Computer Science & Algorithms',
    'You are Sarah Kim, a patient AI computer science tutor.'
WHERE NOT EXISTS (SELECT 1 FROM ai_bots WHERE bot_name = 'Sarah Kim');

INSERT INTO ai_bots (user_id, bot_name, personality_type, specialization_focus, system_prompt) 
SELECT 
    (SELECT id FROM users LIMIT 1),
    'Emma Thompson',
    'Supportive Writing Coach',
    'Essay Writing & Academic Writing', 
    'You are Emma Thompson, a supportive AI essay writing coach.'
WHERE NOT EXISTS (SELECT 1 FROM ai_bots WHERE bot_name = 'Emma Thompson');

INSERT INTO ai_bots (user_id, bot_name, personality_type, specialization_focus, system_prompt) 
SELECT 
    (SELECT id FROM users LIMIT 1),
    'Mike Rodriguez',
    'Practical Counselor',
    'Academic & Career Counseling',
    'You are Mike Rodriguez, a practical AI academic counselor.'
WHERE NOT EXISTS (SELECT 1 FROM ai_bots WHERE bot_name = 'Mike Rodriguez');

-- Check again after insertion
SELECT 'Final AI Bots Count' as check_type, COUNT(*) as count FROM ai_bots;