-- Fix foreign key constraint error for dual_mode_sessions
-- This script checks the current users table structure and creates compatible tables

-- First, let's check what the users table looks like
DO $$
DECLARE
    user_id_type TEXT;
BEGIN
    -- Get the data type of users.id column
    SELECT data_type INTO user_id_type
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'id';

    RAISE NOTICE 'Users.id column type: %', user_id_type;

    -- Drop existing tables if they exist (to avoid conflicts)
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

    -- Create tables with appropriate data types based on users.id type
    IF user_id_type = 'uuid' THEN
        -- Use UUID type
        EXECUTE '
        CREATE TABLE dual_mode_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            session_mode VARCHAR(20) NOT NULL CHECK (session_mode IN (''code'', ''essay'')),
            lesson_id UUID,
            course_id UUID,
            status VARCHAR(20) NOT NULL DEFAULT ''active'' CHECK (status IN (''active'', ''ended'', ''paused'')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP NULL
        );

        CREATE TABLE session_participants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL CHECK (role IN (''teacher'', ''student'')),
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            left_at TIMESTAMP NULL,
            status VARCHAR(20) NOT NULL DEFAULT ''active'' CHECK (status IN (''active'', ''left'', ''removed'')),
            UNIQUE(session_id, user_id)
        );

        CREATE TABLE essay_homework_assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
            teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            instructions TEXT,
            due_date TIMESTAMP NULL,
            max_words INTEGER NULL,
            reference_document JSONB NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE essay_homework_submissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            assignment_id UUID NOT NULL REFERENCES essay_homework_assignments(id) ON DELETE CASCADE,
            student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            word_count INTEGER NOT NULL DEFAULT 0,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) NOT NULL DEFAULT ''draft'' CHECK (status IN (''draft'', ''submitted'', ''graded'')),
            grade INTEGER NULL CHECK (grade >= 0 AND grade <= 100),
            feedback TEXT NULL,
            graded_at TIMESTAMP NULL,
            graded_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE(assignment_id, student_id)
        );';

    ELSE
        -- Use INTEGER/SERIAL type
        EXECUTE '
        CREATE TABLE dual_mode_sessions (
            id SERIAL PRIMARY KEY,
            teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            session_mode VARCHAR(20) NOT NULL CHECK (session_mode IN (''code'', ''essay'')),
            lesson_id INTEGER,
            course_id INTEGER,
            status VARCHAR(20) NOT NULL DEFAULT ''active'' CHECK (status IN (''active'', ''ended'', ''paused'')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP NULL
        );

        CREATE TABLE session_participants (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL CHECK (role IN (''teacher'', ''student'')),
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            left_at TIMESTAMP NULL,
            status VARCHAR(20) NOT NULL DEFAULT ''active'' CHECK (status IN (''active'', ''left'', ''removed'')),
            UNIQUE(session_id, user_id)
        );

        CREATE TABLE essay_homework_assignments (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
            teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            instructions TEXT,
            due_date TIMESTAMP NULL,
            max_words INTEGER NULL,
            reference_document JSONB NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE essay_homework_submissions (
            id SERIAL PRIMARY KEY,
            assignment_id INTEGER NOT NULL REFERENCES essay_homework_assignments(id) ON DELETE CASCADE,
            student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            word_count INTEGER NOT NULL DEFAULT 0,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) NOT NULL DEFAULT ''draft'' CHECK (status IN (''draft'', ''submitted'', ''graded'')),
            grade INTEGER NULL CHECK (grade >= 0 AND grade <= 100),
            feedback TEXT NULL,
            graded_at TIMESTAMP NULL,
            graded_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE(assignment_id, student_id)
        );';
    END IF;

    -- Create additional supporting tables (these are less critical)
    EXECUTE '
    CREATE TABLE essay_collaboration_sessions (
        id ' || CASE WHEN user_id_type = 'uuid' THEN 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' ELSE 'SERIAL PRIMARY KEY' END || ',
        session_id ' || CASE WHEN user_id_type = 'uuid' THEN 'UUID' ELSE 'INTEGER' END || ' NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
        content TEXT,
        last_updated_by ' || CASE WHEN user_id_type = 'uuid' THEN 'UUID' ELSE 'INTEGER' END || ' REFERENCES users(id) ON DELETE SET NULL,
        last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        version INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE session_chat_messages (
        id ' || CASE WHEN user_id_type = 'uuid' THEN 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' ELSE 'SERIAL PRIMARY KEY' END || ',
        session_id ' || CASE WHEN user_id_type = 'uuid' THEN 'UUID' ELSE 'INTEGER' END || ' NOT NULL REFERENCES dual_mode_sessions(id) ON DELETE CASCADE,
        user_id ' || CASE WHEN user_id_type = 'uuid' THEN 'UUID' ELSE 'INTEGER' END || ' NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT ''text'' CHECK (message_type IN (''text'', ''system'', ''file'', ''code'')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );';

    -- Create basic indexes
    CREATE INDEX idx_dual_mode_sessions_teacher_id ON dual_mode_sessions(teacher_id);
    CREATE INDEX idx_dual_mode_sessions_status ON dual_mode_sessions(status);
    CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
    CREATE INDEX idx_essay_homework_assignments_session_id ON essay_homework_assignments(session_id);

    RAISE NOTICE 'Dual-mode session tables created successfully with % ID type!', user_id_type;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating tables: %', SQLERRM;
        RAISE NOTICE 'Please check your users table structure and run the appropriate schema file manually.';
END $$;