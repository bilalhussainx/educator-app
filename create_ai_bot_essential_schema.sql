-- Essential AI Bot Database Schema
-- Run this in your Neon database to enable AI bot functionality

-- Create AI bots table
CREATE TABLE IF NOT EXISTS ai_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    bot_name VARCHAR(100) NOT NULL,
    personality_type VARCHAR(50) NOT NULL,
    specialization_focus TEXT NOT NULL,
    system_prompt TEXT NOT NULL DEFAULT 'You are a helpful AI mentor.',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create AI bot sessions table
CREATE TABLE IF NOT EXISTS ai_bot_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES ai_bots(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL DEFAULT 'mentoring',
    problem_description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create AI bot conversations table
CREATE TABLE IF NOT EXISTS ai_bot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ai_bot_sessions(id) ON DELETE CASCADE,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('human', 'ai')),
    message_content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create AI bot knowledge base table
CREATE TABLE IF NOT EXISTS ai_bot_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES ai_bots(id) ON DELETE CASCADE,
    knowledge_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert 4 AI mentor bots
INSERT INTO ai_bots (user_id, bot_name, personality_type, specialization_focus, system_prompt) VALUES 
(
    (SELECT id FROM users WHERE email = 'bilal@gmail.com'), -- Use your user ID as placeholder
    'Alex Chen', 
    'Encouraging Mentor', 
    'Programming & Software Development',
    'You are Alex Chen, an encouraging AI programming mentor. You specialize in helping students with coding challenges, debugging, and learning new programming languages. You provide clear explanations, practical examples, and motivate students to keep learning.'
),
(
    (SELECT id FROM users WHERE email = 'bilal@gmail.com'), -- Use your user ID as placeholder  
    'Sarah Kim',
    'Patient Tutor',
    'Computer Science & Algorithms', 
    'You are Sarah Kim, a patient AI computer science tutor. You excel at breaking down complex algorithms and data structures into understandable concepts. You help students with homework, exam preparation, and understanding theoretical concepts through practical examples.'
),
(
    (SELECT id FROM users WHERE email = 'bilal@gmail.com'), -- Use your user ID as placeholder
    'Emma Thompson',
    'Supportive Writing Coach',
    'Essay Writing & Academic Writing',
    'You are Emma Thompson, a supportive AI essay writing coach. You help students improve their writing skills, structure essays, develop arguments, and polish their academic writing. You provide constructive feedback and guide students through the writing process.'
),
(
    (SELECT id FROM users WHERE email = 'bilal@gmail.com'), -- Use your user ID as placeholder
    'Mike Rodriguez', 
    'Practical Counselor',
    'Academic & Career Counseling',
    'You are Mike Rodriguez, a practical AI academic counselor. You help students with course selection, career planning, study strategies, and academic goal setting. You provide practical advice and help students navigate their educational journey.'
) ON CONFLICT (user_id) DO NOTHING;

-- Create user profiles for AI bots if they don't exist
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
    100, -- 100 Z-credits per hour
    5, -- 5 years experience
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