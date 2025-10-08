-- Debug script to check urgent session prerequisites

-- Check if required tables exist
SELECT 'ai_bots table' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ai_bots'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 'user_profiles table' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_profiles'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 'session_requests table' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'session_requests'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check AI bots data
SELECT 'Total AI bots' as metric, COUNT(*) as value FROM ai_bots;

SELECT 'Active AI bots' as metric, COUNT(*) as value FROM ai_bots WHERE is_active = true;

-- Check user profiles for AI bots
SELECT 'AI bot profiles with mentor flag' as metric, 
    COUNT(*) as value 
FROM user_profiles up 
JOIN ai_bots ab ON up.user_id = ab.user_id 
WHERE up.is_mentor = true;

SELECT 'AI bot profiles with essay_editor flag' as metric, 
    COUNT(*) as value 
FROM user_profiles up 
JOIN ai_bots ab ON up.user_id = ab.user_id 
WHERE up.is_essay_editor = true;

-- Show available bots
SELECT 
    ab.bot_name,
    ab.is_active,
    ab.current_active_sessions,
    ab.max_concurrent_sessions,
    up.is_mentor,
    up.is_counselor,
    up.is_essay_editor,
    up.display_name
FROM ai_bots ab
LEFT JOIN user_profiles up ON ab.user_id = up.user_id
WHERE ab.is_active = true
ORDER BY ab.bot_name;