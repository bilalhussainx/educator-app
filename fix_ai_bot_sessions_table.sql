-- Fix ai_bot_sessions table - Add missing columns

-- Add missing columns to ai_bot_sessions table
ALTER TABLE ai_bot_sessions 
ADD COLUMN IF NOT EXISTS lesson_id UUID,
ADD COLUMN IF NOT EXISTS course_id UUID,
ADD COLUMN IF NOT EXISTS initial_problem TEXT,
ADD COLUMN IF NOT EXISTS active_sessions_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT '{}';

-- Update the problem_description column name if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_bot_sessions' AND column_name = 'problem_description'
    ) THEN
        ALTER TABLE ai_bot_sessions RENAME COLUMN problem_description TO initial_problem;
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        -- Column already exists, do nothing
        NULL;
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ai_bot_sessions' 
ORDER BY ordinal_position;