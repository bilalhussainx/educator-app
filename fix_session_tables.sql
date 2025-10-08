-- Fix session tables migration - handles existing tables safely

-- First, let's check if session_requests table exists and create it if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'session_requests') THEN
        CREATE TABLE session_requests (
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
        
        -- Add foreign key constraints for session_requests if users table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
            ALTER TABLE session_requests ADD CONSTRAINT session_requests_student_id_fkey 
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
            ALTER TABLE session_requests ADD CONSTRAINT session_requests_mentor_id_fkey 
                FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'Created session_requests table';
    ELSE
        RAISE NOTICE 'session_requests table already exists';
    END IF;
END
$$;

-- Handle sessions table - it exists but may need columns added
DO $$
BEGIN
    -- Add missing columns to existing sessions table if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'session_type') THEN
        ALTER TABLE sessions ADD COLUMN session_type VARCHAR(50);
        RAISE NOTICE 'Added session_type column to sessions table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'description') THEN
        ALTER TABLE sessions ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to sessions table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'tool') THEN
        ALTER TABLE sessions ADD COLUMN tool VARCHAR(50) DEFAULT 'ascendialaunchpad';
        RAISE NOTICE 'Added tool column to sessions table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'session_data') THEN
        ALTER TABLE sessions ADD COLUMN session_data JSONB;
        RAISE NOTICE 'Added session_data column to sessions table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'updated_at') THEN
        ALTER TABLE sessions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at column to sessions table';
    END IF;
END
$$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_session_requests_student_id ON session_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_mentor_id ON session_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_status ON session_requests(status);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor_id ON sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_time ON sessions(scheduled_time);

-- Create or replace the trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create session_types table if it doesn't exist (for reference data)
CREATE TABLE IF NOT EXISTS session_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Insert session types if they don't exist
INSERT INTO session_types (name, description) VALUES 
    ('mentoring', 'General mentoring session'),
    ('tutoring', 'Subject-specific tutoring'),
    ('essay_editing', 'Essay review and editing'),
    ('collaboration', 'Peer collaboration session'),
    ('counseling', 'Academic counseling session')
ON CONFLICT (name) DO NOTHING;

-- Check the current sessions table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;

RAISE NOTICE 'Session tables migration completed successfully!';