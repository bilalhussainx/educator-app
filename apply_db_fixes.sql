CREATE TABLE IF NOT EXISTS session_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL,
    duration INTEGER DEFAULT 30,
    preferred_time TIMESTAMP,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    is_free BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(20),
    z_credits_cost DECIMAL(10, 2) DEFAULT 0.00,
    real_money_cost DECIMAL(10, 2) DEFAULT 0.00,
    session_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    live_session_id UUID,
    student_id UUID,
    subject VARCHAR(200),
    topic VARCHAR(200),
    lesson_id UUID,
    course_id UUID,
    urgency_level VARCHAR(20),
    scheduled_time TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_requests_requester ON session_requests(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_session_requests_mentor ON session_requests(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_session_requests_status ON session_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_session_requests_free ON session_requests(is_free, status);

ALTER TABLE session_requests 
ADD COLUMN IF NOT EXISTS live_session_id UUID,
ADD COLUMN IF NOT EXISTS student_id UUID,
ADD COLUMN IF NOT EXISTS subject VARCHAR(200),
ADD COLUMN IF NOT EXISTS topic VARCHAR(200),
ADD COLUMN IF NOT EXISTS lesson_id UUID,
ADD COLUMN IF NOT EXISTS course_id UUID,
ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20),
ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS document_id UUID;

CREATE TABLE IF NOT EXISTS live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID,
    mentor_id UUID NOT NULL REFERENCES users(id),
    student_id UUID NOT NULL REFERENCES users(id),
    lesson_id UUID,
    course_id UUID,
    session_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_minutes INTEGER,
    ai_bot_session BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS specializations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_specializations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialization_id UUID NOT NULL REFERENCES specializations(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate',
    years_experience INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, specialization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_specializations_user ON user_specializations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_specializations_spec ON user_specializations(specialization_id);

INSERT INTO specializations (name, category, description) VALUES
('Programming & Software Development', 'computer_science', 'General programming, debugging, and software development help'),
('Computer Science & Algorithms', 'computer_science', 'Data structures, algorithms, and theoretical computer science'),
('Essay Writing & Academic Writing', 'essay_writing', 'Essay structure, academic writing, and composition help'),
('Academic & Career Counseling', 'counseling', 'Academic planning, career guidance, and educational support')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    bot_name VARCHAR(100) NOT NULL,
    bot_type VARCHAR(50) DEFAULT 'mentor',
    personality_type VARCHAR(50) NOT NULL,
    intelligence_level INTEGER DEFAULT 85,
    specialization_focus VARCHAR(200),
    teaching_style VARCHAR(50),
    communication_tone VARCHAR(50),
    model_version VARCHAR(50) DEFAULT 'gemini-1.5-flash',
    temperature DECIMAL(3,2) DEFAULT 0.70,
    max_tokens INTEGER DEFAULT 2000,
    context_window INTEGER DEFAULT 8000,
    is_active BOOLEAN DEFAULT TRUE,
    availability_hours JSON,
    max_concurrent_sessions INTEGER DEFAULT 3,
    current_active_sessions INTEGER DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    successful_completions INTEGER DEFAULT 0,
    average_satisfaction DECIMAL(3,2) DEFAULT 4.50,
    total_mentoring_hours INTEGER DEFAULT 0,
    greeting_messages TEXT[],
    encouragement_phrases TEXT[],
    explanation_style TEXT,
    error_handling_approach TEXT,
    system_prompt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_bot_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES ai_bots(id),
    student_id UUID NOT NULL REFERENCES users(id),
    session_type VARCHAR(50) NOT NULL,
    lesson_id UUID,
    course_id UUID,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_minutes INTEGER,
    student_satisfaction INTEGER,
    learning_objectives_met BOOLEAN DEFAULT FALSE,
    initial_problem TEXT,
    solution_provided TEXT,
    learning_progress JSON,
    code_reviewed TEXT,
    response_accuracy INTEGER,
    helpfulness_rating INTEGER,
    ai_confidence_level DECIMAL(3,2),
    session_data JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ai_bot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ai_bot_sessions(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL,
    message_content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_order INTEGER DEFAULT 0,
    message_type VARCHAR(50) DEFAULT 'text',
    ai_reasoning TEXT,
    confidence_score DECIMAL(3,2) DEFAULT 0.00,
    response_time_ms INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    context_used TEXT,
    learning_insights TEXT,
    student_engagement_score DECIMAL(3,2) DEFAULT 0.00,
    follow_up_suggestions TEXT[],
    difficulty_level INTEGER DEFAULT 1,
    topic_tags TEXT[],
    metadata JSONB DEFAULT '{}',
    edited_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

INSERT INTO ai_bots (user_id, bot_name, bot_type, personality_type, specialization_focus, teaching_style, communication_tone, system_prompt)
SELECT 
    (SELECT id FROM users ORDER BY created_at LIMIT 1),
    'Alex Chen',
    'mentor',
    'Encouraging Mentor',
    'Programming & Software Development',
    'collaborative',
    'encouraging',
    'You are Alex Chen, an encouraging AI programming mentor. You specialize in helping students with coding challenges, debugging, and learning new programming languages. You provide clear explanations, practical examples, and motivate students to keep learning.'
WHERE NOT EXISTS (SELECT 1 FROM ai_bots WHERE bot_name = 'Alex Chen');

INSERT INTO ai_bots (user_id, bot_name, bot_type, personality_type, specialization_focus, teaching_style, communication_tone, system_prompt)
SELECT 
    (SELECT id FROM users ORDER BY created_at LIMIT 1),
    'Sarah Kim',
    'mentor', 
    'Patient Tutor',
    'Computer Science & Algorithms',
    'patient',
    'technical',
    'You are Sarah Kim, a patient AI computer science tutor. You excel at breaking down complex algorithms and data structures into understandable concepts. You help students with homework, exam preparation, and understanding theoretical concepts through practical examples.'
WHERE NOT EXISTS (SELECT 1 FROM ai_bots WHERE bot_name = 'Sarah Kim');

INSERT INTO ai_bots (user_id, bot_name, bot_type, personality_type, specialization_focus, teaching_style, communication_tone, system_prompt)
SELECT 
    (SELECT id FROM users ORDER BY created_at LIMIT 1),
    'Emma Thompson',
    'essay_editor',
    'Supportive Writing Coach', 
    'Essay Writing & Academic Writing',
    'collaborative',
    'encouraging',
    'You are Emma Thompson, a supportive AI essay writing coach. You help students improve their writing skills, structure essays, develop arguments, and polish their academic writing. You provide constructive feedback and guide students through the writing process.'
WHERE NOT EXISTS (SELECT 1 FROM ai_bots WHERE bot_name = 'Emma Thompson');

INSERT INTO ai_bots (user_id, bot_name, bot_type, personality_type, specialization_focus, teaching_style, communication_tone, system_prompt)
SELECT 
    (SELECT id FROM users ORDER BY created_at LIMIT 1),
    'Mike Rodriguez',
    'counselor',
    'Practical Counselor',
    'Academic & Career Counseling', 
    'direct',
    'professional',
    'You are Mike Rodriguez, a practical AI academic counselor. You help students with course selection, career planning, study strategies, and academic goal setting. You provide practical advice and help students navigate their educational journey.'
WHERE NOT EXISTS (SELECT 1 FROM ai_bots WHERE bot_name = 'Mike Rodriguez');

UPDATE ai_bots SET current_active_sessions = 0 WHERE current_active_sessions > max_concurrent_sessions;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_searchable_teacher BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_ai_bot BOOLEAN DEFAULT FALSE;

INSERT INTO user_profiles (
    user_id, display_name, bio, is_mentor, is_counselor, is_essay_editor, 
    is_searchable_teacher, verified_mentor, hourly_rate_z_credits, 
    years_experience, languages, availability_status, average_rating, 
    total_sessions, total_reviews, is_ai_bot
)
SELECT 
    ab.user_id,
    ab.bot_name,
    'AI ' || ab.specialization_focus || ' specialist. Available 24/7 for instant help and tutoring.',
    (ab.bot_type = 'mentor'),
    (ab.bot_type = 'counselor'), 
    (ab.bot_type = 'essay_editor'),
    true,
    true,
    100,
    5,
    ARRAY['English'],
    'available',
    4.5,
    0,
    0,
    true
FROM ai_bots ab
ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    is_mentor = EXCLUDED.is_mentor,
    is_counselor = EXCLUDED.is_counselor,
    is_essay_editor = EXCLUDED.is_essay_editor,
    is_searchable_teacher = EXCLUDED.is_searchable_teacher,
    verified_mentor = EXCLUDED.verified_mentor,
    is_ai_bot = EXCLUDED.is_ai_bot;

ALTER TABLE ai_bot_conversations 
DROP CONSTRAINT IF EXISTS ai_bot_conversations_sender_type_check;

ALTER TABLE ai_bot_conversations 
ADD CONSTRAINT ai_bot_conversations_sender_type_check 
CHECK (sender_type IN ('human', 'ai', 'ai_bot', 'system', 'student', 'teacher', 'user'));

SELECT 'session_requests table' as check_type, 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'session_requests'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 'live_sessions table' as check_type, 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'live_sessions'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 'specializations table' as check_type, 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'specializations'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 'user_specializations table' as check_type, 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_specializations'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 'ai_bot_conversations constraint' as check_type, 
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_bot_conversations_sender_type_check'
    ) THEN 'FIXED' ELSE 'MISSING' END as status;

SELECT 'ai_bots table' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ai_bots'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 'ai_bot_sessions table' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ai_bot_sessions'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 'Default AI bots created' as check_type, 
    COALESCE((SELECT COUNT(*) FROM ai_bots), 0) as bot_count;

SELECT 'AI bot profiles created' as check_type,
    COALESCE((SELECT COUNT(*) FROM user_profiles WHERE is_ai_bot = true), 0) as profile_count;

SELECT 'Available mentor bots' as check_type,
    COALESCE((SELECT COUNT(*) FROM ai_bots ab JOIN user_profiles up ON ab.user_id = up.user_id WHERE ab.is_active = true AND up.is_mentor = true), 0) as mentor_count;