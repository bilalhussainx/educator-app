-- Diagnose and fix foreign key constraint issues

-- First, let's check the data types of the relevant columns
\echo 'Checking data types...'

-- Check users table id column type
SELECT 
    table_name, 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'id';

-- Check sessions table student_id and mentor_id column types
SELECT 
    table_name, 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sessions' AND column_name IN ('student_id', 'mentor_id');

-- Check session_requests table student_id and mentor_id column types
SELECT 
    table_name, 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'session_requests' AND column_name IN ('student_id', 'mentor_id');

-- Fix the data type mismatch
DO $$
DECLARE
    users_id_type text;
    sessions_student_type text;
    sessions_mentor_type text;
BEGIN
    -- Get the actual data type of users.id
    SELECT data_type INTO users_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'id';
    
    -- Get the data type of sessions student_id
    SELECT data_type INTO sessions_student_type 
    FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'student_id';
    
    -- Get the data type of sessions mentor_id
    SELECT data_type INTO sessions_mentor_type 
    FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'mentor_id';
    
    RAISE NOTICE 'users.id type: %', users_id_type;
    RAISE NOTICE 'sessions.student_id type: %', sessions_student_type;
    RAISE NOTICE 'sessions.mentor_id type: %', sessions_mentor_type;
    
    -- If users.id is UUID and sessions columns are INTEGER, we need to fix this
    IF users_id_type = 'uuid' AND sessions_student_type = 'integer' THEN
        RAISE NOTICE 'Converting sessions table columns from INTEGER to UUID...';
        
        -- Drop existing sessions table and recreate with correct types
        DROP TABLE IF EXISTS sessions CASCADE;
        
        CREATE TABLE sessions (
            id SERIAL PRIMARY KEY,
            student_id UUID NOT NULL,
            mentor_id UUID NOT NULL,
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
        
        -- Add foreign key constraints
        ALTER TABLE sessions ADD CONSTRAINT sessions_student_id_fkey 
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE sessions ADD CONSTRAINT sessions_mentor_id_fkey 
            FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE;
            
        RAISE NOTICE 'Successfully recreated sessions table with UUID columns';
        
    ELSIF users_id_type = 'integer' AND sessions_student_type = 'integer' THEN
        RAISE NOTICE 'Data types match (INTEGER), adding foreign key constraints...';
        
        -- Add foreign key constraints
        ALTER TABLE sessions ADD CONSTRAINT sessions_student_id_fkey 
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE sessions ADD CONSTRAINT sessions_mentor_id_fkey 
            FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE;
            
    ELSE
        RAISE NOTICE 'Unexpected data type combination: users.id=%, sessions.student_id=%', users_id_type, sessions_student_type;
    END IF;
    
    -- Check session_requests table and fix if needed
    IF users_id_type = 'uuid' THEN
        -- Check if session_requests needs fixing too
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_requests' AND column_name = 'student_id' AND data_type = 'integer') THEN
            RAISE NOTICE 'Converting session_requests table columns from INTEGER to UUID...';
            
            DROP TABLE IF EXISTS session_requests CASCADE;
            
            CREATE TABLE session_requests (
                id SERIAL PRIMARY KEY,
                student_id UUID NOT NULL,
                mentor_id UUID NOT NULL,
                session_type VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                preferred_tool VARCHAR(50) DEFAULT 'ascendialaunchpad',
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP,
                scheduled_time TIMESTAMP
            );
            
            -- Add foreign key constraints
            ALTER TABLE session_requests ADD CONSTRAINT session_requests_student_id_fkey 
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
            ALTER TABLE session_requests ADD CONSTRAINT session_requests_mentor_id_fkey 
                FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE;
                
            RAISE NOTICE 'Successfully recreated session_requests table with UUID columns';
        END IF;
    END IF;
    
END
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_session_requests_student_id ON session_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_mentor_id ON session_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_status ON session_requests(status);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor_id ON sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_time ON sessions(scheduled_time);

-- Create trigger function and trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

\echo 'Foreign key issue fix completed!'

-- Show final table structures
\echo 'Final sessions table structure:'
\d sessions

\echo 'Final session_requests table structure:'
\d session_requests