-- Add session_mode column to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS session_mode VARCHAR(20) CHECK (session_mode IN ('code', 'essay'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_sessions_mode ON sessions(session_mode);
