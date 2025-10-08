-- Create session tables from scratch
-- This script safely creates the session tables needed for the Trust Graph functionality

-- Create session_requests table
CREATE TABLE IF NOT EXISTS session_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    mentor_id INTEGER NOT NULL,
    session_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    preferred_tool VARCHAR(50) DEFAULT 'ascendialaunchpad',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    scheduled_time TIMESTAMP
);

-- Create sessions table 
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    mentor_id INTEGER NOT NULL,
    session_type VARCHAR(50) NOT NULL,
    description TEXT,
    tool VARCHAR(50) DEFAULT 'ascendialaunchpad',
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled', 'no_show')),
    scheduled_time TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints only if users table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Add foreign keys for session_requests
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'session_requests_student_id_fkey'
        ) THEN
            ALTER TABLE session_requests ADD CONSTRAINT session_requests_student_id_fkey 
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'session_requests_mentor_id_fkey'
        ) THEN
            ALTER TABLE session_requests ADD CONSTRAINT session_requests_mentor_id_fkey 
                FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        
        -- Add foreign keys for sessions
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'sessions_student_id_fkey'
        ) THEN
            ALTER TABLE sessions ADD CONSTRAINT sessions_student_id_fkey 
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'sessions_mentor_id_fkey'
        ) THEN
            ALTER TABLE sessions ADD CONSTRAINT sessions_mentor_id_fkey 
                FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'Added foreign key constraints';
    ELSE
        RAISE NOTICE 'Users table not found - skipping foreign key constraints';
    END IF;
END
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_requests_student_id ON session_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_mentor_id ON session_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_status ON session_requests(status);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor_id ON sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_time ON sessions(scheduled_time);

-- Create trigger function for updating updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for sessions table
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create session_types reference table
CREATE TABLE IF NOT EXISTS session_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Insert default session types
INSERT INTO session_types (name, description) VALUES 
    ('mentoring', 'General mentoring session'),
    ('tutoring', 'Subject-specific tutoring'),
    ('essay_editing', 'Essay review and editing'),
    ('collaboration', 'Peer collaboration session'),
    ('counseling', 'Academic counseling session')
ON CONFLICT (name) DO NOTHING;

-- Display what was created
\echo 'Session tables created successfully!'
\echo 'Tables created:'
\echo '- session_requests: For storing session requests from students to mentors/teachers'
\echo '- sessions: For storing active/completed sessions'
\echo '- session_types: Reference table for session type definitions'

-- Show table structures
\echo 'Session_requests table structure:'
\d session_requests

\echo 'Sessions table structure:'
\d sessions