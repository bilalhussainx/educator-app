-- Create tables for dual-mode sessions (code + essay)
-- FIXED VERSION - Uses UUID instead of INTEGER for user references

-- Main dual-mode sessions table
CREATE TABLE IF NOT EXISTS dual_mode_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    session_mode VARCHAR(20) NOT NULL CHECK (session_mode IN ('code', 'essay')),
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'paused')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL
);

-- Session participants table
CREATE TABLE IF NOT EXISTS session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'student')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left', 'removed')),
    UNIQUE(session_id, user_id)
);

-- Essay homework assignments table
CREATE TABLE IF NOT EXISTS essay_homework_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS essay_homework_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES essay_homework_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'graded')),
    grade INTEGER NULL CHECK (grade >= 0 AND grade <= 100),
    feedback TEXT NULL,
    graded_at TIMESTAMP NULL,
    graded_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(assignment_id, student_id)
);

-- Real-time essay collaboration tracking
CREATE TABLE IF NOT EXISTS essay_collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    content TEXT,
    last_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Essay comments/feedback from teachers
CREATE TABLE IF NOT EXISTS essay_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NULL REFERENCES users(id) ON DELETE CASCADE, -- NULL means general comment
    selected_text TEXT,
    comment_text TEXT NOT NULL,
    position_start INTEGER NULL,
    position_end INTEGER NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT FALSE
);

-- Session analytics for monitoring
CREATE TABLE IF NOT EXISTS session_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'typing', 'idle', 'submit', 'hand_raise', etc.
    data JSONB, -- Store activity-specific data
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session chat messages
CREATE TABLE IF NOT EXISTS session_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'file', 'code')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Whiteboard data for sessions
CREATE TABLE IF NOT EXISTS session_whiteboard_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    drawing_data JSONB NOT NULL, -- Store drawing lines/shapes as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File sharing in sessions
CREATE TABLE IF NOT EXISTS session_shared_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dual_mode_sessions_teacher_id ON dual_mode_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_dual_mode_sessions_status ON dual_mode_sessions(status);
CREATE INDEX IF NOT EXISTS idx_dual_mode_sessions_mode ON dual_mode_sessions(session_mode);
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_status ON session_participants(status);
CREATE INDEX IF NOT EXISTS idx_essay_homework_assignments_session_id ON essay_homework_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_essay_homework_submissions_assignment_id ON essay_homework_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_essay_homework_submissions_student_id ON essay_homework_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_essay_collaboration_session_id ON essay_collaboration_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_essay_comments_session_id ON essay_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_session_id ON session_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_user_id ON session_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_session_chat_messages_session_id ON session_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_session_whiteboard_session_id ON session_whiteboard_data(session_id);
CREATE INDEX IF NOT EXISTS idx_session_shared_files_session_id ON session_shared_files(session_id);

-- Create triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Only create triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_dual_mode_sessions_updated_at'
    ) THEN
        CREATE TRIGGER update_dual_mode_sessions_updated_at
            BEFORE UPDATE ON dual_mode_sessions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_essay_homework_assignments_updated_at'
    ) THEN
        CREATE TRIGGER update_essay_homework_assignments_updated_at
            BEFORE UPDATE ON essay_homework_assignments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Optional: Add a simple check to verify table creation
DO $$
BEGIN
    RAISE NOTICE 'Dual-mode session schema created successfully!';
    RAISE NOTICE 'Tables created: dual_mode_sessions, session_participants, essay_homework_assignments, essay_homework_submissions, essay_collaboration_sessions, essay_comments, session_analytics, session_chat_messages, session_whiteboard_data, session_shared_files';
END $$;