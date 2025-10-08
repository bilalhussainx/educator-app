-- Complete AI Bot Database Schema - All Required Tables and Columns
-- Run this in your Neon database to fix all AI bot functionality

-- ===== AI BOT SESSIONS TABLE =====
-- Add missing columns to ai_bot_sessions
ALTER TABLE ai_bot_sessions 
ADD COLUMN IF NOT EXISTS lesson_id UUID,
ADD COLUMN IF NOT EXISTS course_id UUID,
ADD COLUMN IF NOT EXISTS initial_problem TEXT,
ADD COLUMN IF NOT EXISTS active_sessions_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT '{}';

-- Rename problem_description to initial_problem if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_bot_sessions' AND column_name = 'problem_description'
    ) THEN
        ALTER TABLE ai_bot_sessions RENAME COLUMN problem_description TO initial_problem;
    END IF;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- ===== AI BOT CONVERSATIONS TABLE =====
-- Add ALL missing columns to ai_bot_conversations
ALTER TABLE ai_bot_conversations 
ADD COLUMN IF NOT EXISTS message_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS context_used TEXT,
ADD COLUMN IF NOT EXISTS learning_insights TEXT,
ADD COLUMN IF NOT EXISTS student_engagement_score DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS follow_up_suggestions TEXT[],
ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS topic_tags TEXT[],
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- ===== CERTIFICATES TABLE =====
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID,
    lesson_id UUID,
    issued_by UUID REFERENCES users(id),
    certificate_type VARCHAR(50) NOT NULL DEFAULT 'completion',
    status VARCHAR(20) DEFAULT 'issued',
    title VARCHAR(200),
    description TEXT,
    issued_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    certificate_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== LESSON COMPLETIONS TABLE =====
CREATE TABLE IF NOT EXISTS lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL,
    course_id UUID,
    completed_at TIMESTAMP DEFAULT NOW(),
    completion_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);

-- ===== AI BOT ANALYTICS TABLE =====
CREATE TABLE IF NOT EXISTS ai_bot_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES ai_bots(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    sessions_conducted INTEGER DEFAULT 0,
    problems_solved INTEGER DEFAULT 0,
    students_helped INTEGER DEFAULT 0,
    lessons_completed INTEGER DEFAULT 0,
    certificates_issued INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    average_response_time_ms DECIMAL(10,2) DEFAULT 0,
    student_satisfaction_score DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(bot_id, date)
);

-- ===== CREATE INDEXES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_ai_bot_conversations_session_order 
ON ai_bot_conversations (session_id, message_order);

CREATE INDEX IF NOT EXISTS idx_ai_bot_sessions_student_id 
ON ai_bot_sessions (student_id);

CREATE INDEX IF NOT EXISTS idx_ai_bot_sessions_bot_id 
ON ai_bot_sessions (bot_id);

CREATE INDEX IF NOT EXISTS idx_certificates_student_id 
ON certificates (student_id);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_student_lesson 
ON lesson_completions (student_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_ai_bot_analytics_bot_date 
ON ai_bot_analytics (bot_id, date);

-- ===== INSERT AI BOTS IF NOT EXISTS =====
-- Insert AI bots using any available user ID
INSERT INTO ai_bots (user_id, bot_name, personality_type, specialization_focus, system_prompt) 
SELECT 
    (SELECT id FROM users LIMIT 1),
    'Alex Chen', 
    'Encouraging Mentor', 
    'Programming & Software Development',
    'You are Alex Chen, an encouraging AI programming mentor. You specialize in helping students with coding challenges, debugging, and learning new programming languages. You provide clear explanations, practical examples, and motivate students to keep learning.'
WHERE NOT EXISTS (SELECT 1 FROM ai_bots WHERE bot_name = 'Alex Chen');

INSERT INTO ai_bots (user_id, bot_name, personality_type, specialization_focus, system_prompt) 
SELECT 
    (SELECT id FROM users LIMIT 1),
    'Sarah Kim',
    'Patient Tutor',
    'Computer Science & Algorithms', 
    'You are Sarah Kim, a patient AI computer science tutor. You excel at breaking down complex algorithms and data structures into understandable concepts. You help students with homework, exam preparation, and understanding theoretical concepts through practical examples.'
WHERE NOT EXISTS (SELECT 1 FROM ai_bots WHERE bot_name = 'Sarah Kim');

INSERT INTO ai_bots (user_id, bot_name, personality_type, specialization_focus, system_prompt) 
SELECT 
    (SELECT id FROM users LIMIT 1),
    'Emma Thompson',
    'Supportive Writing Coach',
    'Essay Writing & Academic Writing',
    'You are Emma Thompson, a supportive AI essay writing coach. You help students improve their writing skills, structure essays, develop arguments, and polish their academic writing. You provide constructive feedback and guide students through the writing process.'
WHERE NOT EXISTS (SELECT 1 FROM ai_bots WHERE bot_name = 'Emma Thompson');

INSERT INTO ai_bots (user_id, bot_name, personality_type, specialization_focus, system_prompt) 
SELECT 
    (SELECT id FROM users LIMIT 1),
    'Mike Rodriguez', 
    'Practical Counselor',
    'Academic & Career Counseling',
    'You are Mike Rodriguez, a practical AI academic counselor. You help students with course selection, career planning, study strategies, and academic goal setting. You provide practical advice and help students navigate their educational journey.'
WHERE NOT EXISTS (SELECT 1 FROM ai_bots WHERE bot_name = 'Mike Rodriguez');

-- ===== CREATE USER PROFILES FOR AI BOTS =====
INSERT INTO user_profiles (
    user_id, 
    display_name, 
    bio, 
    is_mentor, 
    is_counselor, 
    is_essay_editor,
    is_searchable_teacher,
    verified_mentor,
    hourly_rate_z_credits,
    years_experience,
    languages,
    availability_status
) 
SELECT 
    ab.user_id,
    ab.bot_name,
    'AI ' || ab.specialization_focus || ' specialist. Available 24/7 for instant help and tutoring.',
    true,
    (ab.specialization_focus LIKE '%Counseling%'),
    (ab.specialization_focus LIKE '%Writing%'),
    true,
    true,
    100,
    5,
    ARRAY['English'],
    'available'
FROM ai_bots ab
ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    is_mentor = EXCLUDED.is_mentor,
    is_counselor = EXCLUDED.is_counselor, 
    is_essay_editor = EXCLUDED.is_essay_editor,
    is_searchable_teacher = EXCLUDED.is_searchable_teacher,
    verified_mentor = EXCLUDED.verified_mentor;

-- ===== VERIFICATION QUERIES =====
SELECT 'AI Bots Created' as status, COUNT(*) as count FROM ai_bots;
SELECT 'AI Bot Sessions Columns' as status, COUNT(*) as column_count 
FROM information_schema.columns WHERE table_name = 'ai_bot_sessions';
SELECT 'AI Bot Conversations Columns' as status, COUNT(*) as column_count 
FROM information_schema.columns WHERE table_name = 'ai_bot_conversations';
SELECT 'Tables Created' as status, 
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certificates') THEN 'certificates ✓ ' ELSE '' END) ||
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lesson_completions') THEN 'lesson_completions ✓ ' ELSE '' END) ||
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_bot_analytics') THEN 'ai_bot_analytics ✓ ' ELSE '' END) as tables_status;