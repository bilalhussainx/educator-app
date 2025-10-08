-- Safe version of dual-mode sessions schema
-- This version avoids foreign key constraints that might fail due to data type mismatches

-- Drop existing tables if they exist
DROP TABLE IF EXISTS session_shared_files CASCADE;
DROP TABLE IF EXISTS session_whiteboard_data CASCADE;
DROP TABLE IF EXISTS session_chat_messages CASCADE;
DROP TABLE IF EXISTS session_analytics CASCADE;
DROP TABLE IF EXISTS essay_comments CASCADE;
DROP TABLE IF EXISTS essay_collaboration_sessions CASCADE;
DROP TABLE IF EXISTS essay_homework_submissions CASCADE;
DROP TABLE IF EXISTS essay_homework_assignments CASCADE;
DROP TABLE IF EXISTS session_participants CASCADE;
DROP TABLE IF EXISTS dual_mode_sessions CASCADE;

-- Main dual-mode sessions table (without problematic foreign keys)
CREATE TABLE dual_mode_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    teacher_id VARCHAR(36) NOT NULL, -- Will reference users(id) but without FK constraint
    title VARCHAR(255) NOT NULL,
    description TEXT,
    session_mode VARCHAR(20) NOT NULL CHECK (session_mode IN ('code', 'essay')),
    lesson_id VARCHAR(36), -- Optional reference to lessons
    course_id VARCHAR(36), -- Optional reference to courses
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'paused')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL
);

-- Session participants table
CREATE TABLE session_participants (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    session_id VARCHAR(36) NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL, -- Will reference users(id) but without FK constraint
    role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'student')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left', 'removed')),
    UNIQUE(session_id, user_id)
);

-- Essay homework assignments table
CREATE TABLE essay_homework_assignments (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    session_id VARCHAR(36) NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    teacher_id VARCHAR(36) NOT NULL, -- Will reference users(id) but without FK constraint
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT,
    due_date TIMESTAMP NULL,
    max_words INTEGER NULL,
    reference_document JSONB NULL, -- Store document info as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Essay homework submissions table
CREATE TABLE essay_homework_submissions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    assignment_id VARCHAR(36) NOT NULL REFERENCES essay_homework_assignments(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL, -- Will reference users(id) but without FK constraint
    content TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'graded')),
    grade INTEGER NULL CHECK (grade >= 0 AND grade <= 100),
    feedback TEXT NULL,
    graded_at TIMESTAMP NULL,
    graded_by VARCHAR(36) NULL, -- Will reference users(id) but without FK constraint
    UNIQUE(assignment_id, student_id)
);

-- Real-time essay collaboration tracking
CREATE TABLE essay_collaboration_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    session_id VARCHAR(36) NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    content TEXT,
    last_updated_by VARCHAR(36), -- Will reference users(id) but without FK constraint
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Session chat messages
CREATE TABLE session_chat_messages (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    session_id VARCHAR(36) NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL, -- Will reference users(id) but without FK constraint
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'file', 'code')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session analytics for monitoring
CREATE TABLE session_analytics (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    session_id VARCHAR(36) NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL, -- Will reference users(id) but without FK constraint
    activity_type VARCHAR(50) NOT NULL, -- 'typing', 'idle', 'submit', 'hand_raise', etc.
    data JSONB, -- Store activity-specific data
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Essay comments/feedback from teachers
CREATE TABLE essay_comments (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    session_id VARCHAR(36) NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    teacher_id VARCHAR(36) NOT NULL, -- Will reference users(id) but without FK constraint
    student_id VARCHAR(36) NULL, -- Will reference users(id) but without FK constraint, NULL means general comment
    selected_text TEXT,
    comment_text TEXT NOT NULL,
    position_start INTEGER NULL,
    position_end INTEGER NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX idx_dual_mode_sessions_teacher_id ON dual_mode_sessions(teacher_id);
CREATE INDEX idx_dual_mode_sessions_status ON dual_mode_sessions(status);
CREATE INDEX idx_dual_mode_sessions_mode ON dual_mode_sessions(session_mode);
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX idx_session_participants_status ON session_participants(status);
CREATE INDEX idx_essay_homework_assignments_session_id ON essay_homework_assignments(session_id);
CREATE INDEX idx_essay_homework_submissions_assignment_id ON essay_homework_submissions(assignment_id);
CREATE INDEX idx_essay_homework_submissions_student_id ON essay_homework_submissions(student_id);
CREATE INDEX idx_essay_collaboration_session_id ON essay_collaboration_sessions(session_id);
CREATE INDEX idx_essay_comments_session_id ON essay_comments(session_id);
CREATE INDEX idx_session_analytics_session_id ON session_analytics(session_id);
CREATE INDEX idx_session_analytics_user_id ON session_analytics(user_id);
CREATE INDEX idx_session_chat_messages_session_id ON session_chat_messages(session_id);

-- Create triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (with conflict handling)
DO $$
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_dual_mode_sessions_updated_at ON dual_mode_sessions;
    DROP TRIGGER IF EXISTS update_essay_homework_assignments_updated_at ON essay_homework_assignments;

    -- Create new triggers
    CREATE TRIGGER update_dual_mode_sessions_updated_at
        BEFORE UPDATE ON dual_mode_sessions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_essay_homework_assignments_updated_at
        BEFORE UPDATE ON essay_homework_assignments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE 'Dual-mode session schema created successfully!';
    RAISE NOTICE 'Note: User references are stored as VARCHAR(36) without foreign key constraints to avoid data type conflicts';
    RAISE NOTICE 'Tables created: dual_mode_sessions, session_participants, essay_homework_assignments, essay_homework_submissions, essay_collaboration_sessions, essay_comments, session_analytics, session_chat_messages';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in trigger creation: %', SQLERRM;
END $$;

-- Insert sample data for testing (commented out by default)
/*
INSERT INTO dual_mode_sessions (teacher_id, title, description, session_mode, status) VALUES
('teacher-uuid-here', 'Introduction to Python Programming', 'Learn the basics of Python with hands-on coding exercises', 'code', 'active'),
('teacher-uuid-here', 'Essay Writing Workshop', 'Collaborative essay writing with real-time feedback', 'essay', 'active');
*/