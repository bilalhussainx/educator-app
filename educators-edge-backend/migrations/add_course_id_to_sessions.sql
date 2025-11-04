-- Add course_id column to sessions table for course-based notifications
-- This enables proper notification broadcasting to enrolled students

-- Add the course_id column
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES enhanced_courses(id) ON DELETE SET NULL;

-- Add index for faster queries when broadcasting to course students
CREATE INDEX IF NOT EXISTS idx_sessions_course_id ON sessions(course_id);

-- Add index for combined queries (course + status)
CREATE INDEX IF NOT EXISTS idx_sessions_course_status ON sessions(course_id, status);

-- Optional: Add description column if it doesn't exist
-- (used for session title in notifications)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN sessions.course_id IS 'References the course this session is associated with. Used for broadcasting notifications to enrolled students.';
