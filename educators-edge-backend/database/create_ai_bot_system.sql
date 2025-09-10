-- AI Bot System Database Schema
-- This creates intelligent AI mentors that can interact throughout the platform

-- AI Bot Profiles Table
CREATE TABLE IF NOT EXISTS ai_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    bot_name VARCHAR(100) NOT NULL,
    bot_type VARCHAR(50) DEFAULT 'mentor', -- 'mentor', 'counselor', 'essay_editor', 'teaching_assistant'
    personality_type VARCHAR(50) NOT NULL, -- 'encouraging', 'analytical', 'friendly', 'professional', 'creative'
    intelligence_level INTEGER DEFAULT 85, -- 1-100 scale
    specialization_focus VARCHAR(200), -- Primary area of expertise
    teaching_style VARCHAR(50), -- 'socratic', 'direct', 'collaborative', 'patient', 'challenging'
    communication_tone VARCHAR(50), -- 'formal', 'casual', 'encouraging', 'technical', 'adaptive'
    
    -- AI Configuration
    model_version VARCHAR(50) DEFAULT 'gemini-1.5-pro',
    temperature DECIMAL(2,2) DEFAULT 0.7, -- Creativity level
    max_tokens INTEGER DEFAULT 2000,
    context_window INTEGER DEFAULT 8000,
    
    -- Bot Status
    is_active BOOLEAN DEFAULT TRUE,
    availability_hours JSON, -- When bot is "available" for sessions
    max_concurrent_sessions INTEGER DEFAULT 3,
    current_active_sessions INTEGER DEFAULT 0,
    
    -- Performance Metrics
    total_interactions INTEGER DEFAULT 0,
    successful_completions INTEGER DEFAULT 0,
    average_satisfaction DECIMAL(3,2) DEFAULT 4.5,
    total_mentoring_hours INTEGER DEFAULT 0,
    
    -- Bot Personality Details
    greeting_messages TEXT[],
    encouragement_phrases TEXT[],
    explanation_style TEXT,
    error_handling_approach TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Bot Knowledge Base
CREATE TABLE IF NOT EXISTS ai_bot_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES ai_bots(id) ON DELETE CASCADE,
    knowledge_type VARCHAR(50) NOT NULL, -- 'technical', 'pedagogical', 'domain_specific', 'personality'
    topic VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    importance_level INTEGER DEFAULT 5, -- 1-10 scale
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Bot Session Interactions
CREATE TABLE IF NOT EXISTS ai_bot_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES ai_bots(id),
    student_id UUID NOT NULL REFERENCES users(id),
    session_type VARCHAR(50) NOT NULL, -- 'mentoring', 'ide_assistance', 'essay_review', 'counseling'
    lesson_id UUID REFERENCES ingested_lessons(id), -- If related to a specific lesson
    course_id UUID REFERENCES courses(id), -- If related to a course
    
    -- Session Details
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_minutes INTEGER,
    student_satisfaction INTEGER, -- 1-5 rating
    learning_objectives_met BOOLEAN DEFAULT FALSE,
    
    -- Session Context
    initial_problem TEXT,
    solution_provided TEXT,
    learning_progress JSON, -- Track student progress during session
    code_reviewed TEXT, -- If IDE assistance
    
    -- AI Performance
    response_accuracy INTEGER, -- 1-10 scale
    helpfulness_rating INTEGER, -- 1-5 scale
    ai_confidence_level DECIMAL(3,2), -- How confident AI was in responses
    
    status VARCHAR(20) DEFAULT 'active' -- 'active', 'completed', 'abandoned'
);

-- AI Bot Conversation History
CREATE TABLE IF NOT EXISTS ai_bot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ai_bot_sessions(id) ON DELETE CASCADE,
    message_order INTEGER NOT NULL,
    sender_type VARCHAR(20) NOT NULL, -- 'student', 'ai_bot'
    message_content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'code', 'explanation', 'suggestion', 'encouragement'
    
    -- AI Context
    ai_reasoning TEXT, -- Why AI chose this response
    confidence_score DECIMAL(3,2), -- How confident AI was
    context_used TEXT, -- What context/knowledge was used
    
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Bot Achievements and Certificates
CREATE TABLE IF NOT EXISTS ai_bot_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES ai_bots(id),
    achievement_type VARCHAR(50) NOT NULL, -- 'course_completion', 'certification', 'milestone', 'specialization'
    title VARCHAR(200) NOT NULL,
    description TEXT,
    certification_body VARCHAR(200),
    date_earned DATE NOT NULL,
    credential_url VARCHAR(500),
    verification_code VARCHAR(100),
    is_featured BOOLEAN DEFAULT FALSE
);

-- AI Bot Learning Analytics
CREATE TABLE IF NOT EXISTS ai_bot_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES ai_bots(id),
    date DATE DEFAULT CURRENT_DATE,
    
    -- Daily Metrics
    sessions_conducted INTEGER DEFAULT 0,
    students_helped INTEGER DEFAULT 0,
    problems_solved INTEGER DEFAULT 0,
    code_reviews_completed INTEGER DEFAULT 0,
    essays_reviewed INTEGER DEFAULT 0,
    
    -- Performance Metrics
    average_response_time_seconds INTEGER DEFAULT 0,
    average_session_satisfaction DECIMAL(3,2) DEFAULT 0,
    successful_resolution_rate DECIMAL(3,2) DEFAULT 0,
    student_retention_rate DECIMAL(3,2) DEFAULT 0,
    
    -- Learning Metrics
    new_concepts_taught INTEGER DEFAULT 0,
    practice_problems_assigned INTEGER DEFAULT 0,
    improvement_suggestions_made INTEGER DEFAULT 0
);

-- AI Bot Behavioral Patterns
CREATE TABLE IF NOT EXISTS ai_bot_behaviors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES ai_bots(id),
    behavior_type VARCHAR(50) NOT NULL, -- 'response_pattern', 'teaching_method', 'interaction_style'
    trigger_condition VARCHAR(200), -- What triggers this behavior
    behavior_description TEXT NOT NULL,
    success_rate DECIMAL(3,2) DEFAULT 0.5,
    usage_frequency INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_bots_active ON ai_bots(is_active, bot_type);
CREATE INDEX IF NOT EXISTS idx_ai_bot_sessions_student ON ai_bot_sessions(student_id, started_at);
CREATE INDEX IF NOT EXISTS idx_ai_bot_sessions_bot ON ai_bot_sessions(bot_id, started_at);
CREATE INDEX IF NOT EXISTS idx_ai_bot_conversations_session ON ai_bot_conversations(session_id, message_order);
CREATE INDEX IF NOT EXISTS idx_ai_bot_knowledge_bot_topic ON ai_bot_knowledge(bot_id, topic);
CREATE INDEX IF NOT EXISTS idx_ai_bot_analytics_date ON ai_bot_analytics(bot_id, date);

-- Insert sample AI mentor bot data
INSERT INTO users (id, username, email, role, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'ai_mentor_alex', 'alex@aibots.educatorsedge.com', 'teacher', NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'ai_mentor_sarah', 'sarah@aibots.educatorsedge.com', 'teacher', NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'ai_counselor_mike', 'mike@aibots.educatorsedge.com', 'teacher', NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'ai_editor_emma', 'emma@aibots.educatorsedge.com', 'teacher', NOW())
ON CONFLICT (username) DO NOTHING;

-- Insert AI Bot profiles
INSERT INTO ai_bots (id, user_id, bot_name, bot_type, personality_type, specialization_focus, teaching_style, communication_tone, greeting_messages, encouragement_phrases, explanation_style, error_handling_approach) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'Alex Chen - AI Programming Mentor',
    'mentor',
    'encouraging',
    'Full-Stack Web Development, Python, JavaScript',
    'socratic',
    'encouraging',
    ARRAY[
        'Hey there! I''m Alex, your AI programming mentor. Ready to tackle some code together? 🚀',
        'Welcome! I''m here to help you become an amazing developer. What are we working on today?',
        'Hi! I''m Alex, and I love helping students discover the joy of programming. Let''s dive in!'
    ],
    ARRAY[
        'Great progress! You''re really getting the hang of this.',
        'That''s exactly the right thinking! Keep it up.',
        'I can see you''re putting in real effort - that''s what makes great developers.',
        'Excellent debugging skills! That''s how professionals think.',
        'You''re asking all the right questions. Curiosity is key!'
    ],
    'I explain concepts by building from simple examples to complex implementations, always connecting new ideas to what you already know.',
    'When students make errors, I guide them to discover the issue themselves through targeted questions, helping them build debugging intuition.'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'Sarah Rodriguez - AI Computer Science Mentor',
    'mentor',
    'analytical',
    'Data Science, Machine Learning, Algorithms',
    'direct',
    'professional',
    ARRAY[
        'Hello! I''m Sarah, your AI mentor specializing in computer science fundamentals and data science.',
        'Welcome to our session. I''m Sarah, and I''ll help you master algorithms and data structures.',
        'Hi there! Sarah here. Let''s explore the fascinating world of computer science together.'
    ],
    ARRAY[
        'Your analytical approach is impressive.',
        'That''s a sophisticated solution!',
        'You''re thinking like a computer scientist.',
        'Excellent algorithmic reasoning.',
        'Your problem decomposition skills are developing well.'
    ],
    'I focus on fundamental principles first, then show practical applications. I use visualizations and step-by-step breakdowns.',
    'I help students understand the root cause of errors by examining their logic and suggesting systematic debugging approaches.'
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    'Mike Thompson - AI College Counselor',
    'counselor',
    'friendly',
    'College Applications, Career Planning, Academic Strategy',
    'collaborative',
    'casual',
    ARRAY[
        'Hey! I''m Mike, your AI college counselor. Let''s work together on your academic and career journey!',
        'Hi there! Mike here. Ready to plan your path to college success?',
        'Welcome! I''m Mike, and I''m excited to help you navigate your educational future.'
    ],
    ARRAY[
        'You''re making smart choices about your future!',
        'That shows real maturity in your thinking.',
        'Great question - planning ahead like this will serve you well.',
        'I can see you''re really thinking this through carefully.',
        'You''re taking all the right steps!'
    ],
    'I help students break down big decisions into manageable steps and explore all their options together.',
    'When students feel overwhelmed, I help them focus on one step at a time and remind them that every successful person started somewhere.'
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440004',
    'Emma Wilson - AI Essay Editor',
    'essay_editor',
    'creative',
    'Academic Writing, Creative Writing, Essay Structure',
    'patient',
    'formal',
    ARRAY[
        'Good day! I''m Emma, your AI essay editor. Let''s craft compelling and clear writing together.',
        'Hello! Emma here, ready to help you develop your writing skills and perfect your essays.',
        'Welcome! I''m Emma, and I''m passionate about helping students become confident writers.'
    ],
    ARRAY[
        'Your writing voice is becoming much stronger.',
        'That''s a beautifully crafted paragraph.',
        'Excellent use of evidence to support your argument.',
        'Your revision shows real growth as a writer.',
        'I can see your unique perspective coming through clearly.'
    ],
    'I guide students through the writing process step-by-step, focusing on clarity, structure, and developing their unique voice.',
    'When students struggle with writing, I help them identify specific areas for improvement and provide concrete, actionable feedback.'
);

-- Create user profiles for the AI bots
INSERT INTO user_profiles (
    user_id, display_name, bio, location, timezone, 
    is_mentor, is_counselor, is_essay_editor, 
    hourly_rate_z_credits, hourly_rate_usd, 
    years_experience, education_level, languages, 
    availability_status, is_searchable_teacher,
    total_sessions, average_rating, total_reviews, verified_mentor
) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'Alex Chen - AI Programming Mentor',
    'Hi! I''m Alex, an AI mentor specializing in full-stack development. I have extensive knowledge in Python, JavaScript, React, Node.js, and modern web technologies. I love helping students debug code, understand algorithms, and build real-world projects. My teaching approach is hands-on and encouraging - I believe every student can become a great programmer with the right guidance and practice!',
    'Virtual Classroom',
    'UTC',
    TRUE, FALSE, FALSE,
    0.00, 0.00,
    8, 'master',
    ARRAY['English', 'Spanish', 'Mandarin'],
    'available', TRUE,
    1247, 4.9, 423, TRUE
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'Sarah Rodriguez - AI Computer Science Mentor',
    'Hello! I''m Sarah, an AI mentor with deep expertise in computer science fundamentals, data science, and machine learning. I hold advanced degrees in Computer Science and have worked on cutting-edge AI projects. I specialize in algorithms, data structures, statistical analysis, and helping students understand complex computational concepts. My goal is to make computer science accessible and exciting for everyone!',
    'Virtual Classroom',
    'UTC',
    TRUE, FALSE, FALSE,
    0.00, 0.00,
    12, 'phd',
    ARRAY['English', 'Portuguese'],
    'available', TRUE,
    892, 4.8, 301, TRUE
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'Mike Thompson - AI College Counselor',
    'Hey! I''m Mike, your AI college counselor with comprehensive knowledge of higher education systems worldwide. I''ve helped thousands of students navigate college applications, choose majors, plan careers, and develop academic strategies. I understand the stress of college planning and I''m here to make the process clearer and less overwhelming. Together, we''ll create a personalized plan that fits your goals and interests!',
    'Virtual Classroom',
    'UTC',
    FALSE, TRUE, FALSE,
    0.00, 0.00,
    10, 'master',
    ARRAY['English', 'French'],
    'available', TRUE,
    654, 4.7, 198, TRUE
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    'Emma Wilson - AI Essay Editor',
    'Good day! I''m Emma, an AI essay editor with extensive experience in academic and creative writing. I have deep knowledge of writing techniques, essay structure, grammar, style, and citation formats. Whether you''re working on college application essays, research papers, or creative pieces, I''ll help you develop clarity, strengthen your arguments, and find your unique voice. Writing is a powerful tool, and I''m here to help you master it!',
    'Virtual Classroom',
    'UTC',
    FALSE, FALSE, TRUE,
    0.00, 0.00,
    9, 'master',
    ARRAY['English', 'German'],
    'available', TRUE,
    743, 4.8, 267, TRUE
);

-- Add specializations for AI bots
INSERT INTO user_specializations (user_id, specialization_id, proficiency_level, years_experience)
SELECT 
    '550e8400-e29b-41d4-a716-446655440001',
    s.id,
    'expert',
    8
FROM specializations s 
WHERE s.name IN ('Web Development', 'Software Engineering', 'Database Design')
AND NOT EXISTS (
    SELECT 1 FROM user_specializations us 
    WHERE us.user_id = '550e8400-e29b-41d4-a716-446655440001' AND us.specialization_id = s.id
);

INSERT INTO user_specializations (user_id, specialization_id, proficiency_level, years_experience)
SELECT 
    '550e8400-e29b-41d4-a716-446655440002',
    s.id,
    'expert',
    12
FROM specializations s 
WHERE s.name IN ('Data Science', 'Software Engineering')
AND NOT EXISTS (
    SELECT 1 FROM user_specializations us 
    WHERE us.user_id = '550e8400-e29b-41d4-a716-446655440002' AND us.specialization_id = s.id
);

INSERT INTO user_specializations (user_id, specialization_id, proficiency_level, years_experience)
SELECT 
    '550e8400-e29b-41d4-a716-446655440003',
    s.id,
    'expert',
    10
FROM specializations s 
WHERE s.name IN ('College Applications', 'Career Planning', 'Study Skills')
AND NOT EXISTS (
    SELECT 1 FROM user_specializations us 
    WHERE us.user_id = '550e8400-e29b-41d4-a716-446655440003' AND us.specialization_id = s.id
);

INSERT INTO user_specializations (user_id, specialization_id, proficiency_level, years_experience)
SELECT 
    '550e8400-e29b-41d4-a716-446655440004',
    s.id,
    'expert',
    9
FROM specializations s 
WHERE s.name IN ('College Essays', 'Academic Writing', 'Creative Writing')
AND NOT EXISTS (
    SELECT 1 FROM user_specializations us 
    WHERE us.user_id = '550e8400-e29b-41d4-a716-446655440004' AND us.specialization_id = s.id
);

-- Add AI bot achievements and certifications
INSERT INTO ai_bot_achievements (bot_id, achievement_type, title, description, certification_body, date_earned, is_featured) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'certification',
    'Advanced Full-Stack Web Development',
    'Comprehensive certification in modern web development technologies including React, Node.js, and cloud deployment.',
    'AI Education Institute',
    '2023-03-15',
    TRUE
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    'milestone',
    '1000+ Students Mentored',
    'Successfully mentored over 1000 students in programming and web development.',
    'Educators Edge Platform',
    '2024-01-10',
    TRUE
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'certification',
    'Machine Learning Specialization',
    'Advanced certification in machine learning algorithms, neural networks, and data science applications.',
    'AI Research Foundation',
    '2023-06-20',
    TRUE
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'certification',
    'Computer Science Education Excellence',
    'Recognition for outstanding performance in computer science education and student mentorship.',
    'CS Education Board',
    '2023-09-12',
    TRUE
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'certification',
    'College Counseling Professional',
    'Comprehensive certification in college counseling, application strategy, and student guidance.',
    'National Counseling Association',
    '2023-04-08',
    TRUE
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    'certification',
    'Academic Writing Specialist',
    'Advanced certification in academic writing instruction, essay structure, and student writing development.',
    'Writing Education Institute',
    '2023-05-25',
    TRUE
);

-- Add initial knowledge base for AI bots
INSERT INTO ai_bot_knowledge (bot_id, knowledge_type, topic, content, importance_level) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'technical',
    'JavaScript Debugging',
    'Common debugging techniques include using console.log, browser dev tools, breakpoints, and understanding error messages. Always read error messages carefully - they often tell you exactly what''s wrong and where.',
    9
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    'pedagogical',
    'Code Review Process',
    'When reviewing student code, focus on: 1) Understanding their logic first, 2) Identifying what works well, 3) Suggesting improvements for readability, 4) Helping them discover bugs through questions, 5) Encouraging good practices.',
    10
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'technical',
    'Algorithm Complexity',
    'Big O notation helps us understand how algorithm performance scales. Focus on practical examples: O(1) - array access, O(n) - simple loops, O(n²) - nested loops, O(log n) - binary search.',
    9
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'domain_specific',
    'College Application Timeline',
    'Junior year: Take standardized tests, research colleges. Senior year fall: Applications due, essays written. Spring: Decisions received, deposits made. Always start early!',
    10
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    'domain_specific',
    'Essay Structure',
    'Strong essays have: 1) Compelling introduction with clear thesis, 2) Body paragraphs with topic sentences and evidence, 3) Smooth transitions between ideas, 4) Conclusion that reinforces main points without just repeating.',
    9
);

COMMIT;