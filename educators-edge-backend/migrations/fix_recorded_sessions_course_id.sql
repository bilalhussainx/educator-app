-- Migration: Fix recorded_sessions.course_id to match courses table ID type
-- The courses table uses INTEGER ids, but recorded_sessions.course_id was defined as UUID
-- This migration changes course_id from UUID to INTEGER to match the courses table

BEGIN;

-- Step 1: Drop the existing foreign key constraint if it exists
-- (This might not exist depending on how the table was created)
ALTER TABLE recorded_sessions DROP CONSTRAINT IF EXISTS recorded_sessions_course_id_fkey;

-- Step 2: Change the course_id column from UUID to INTEGER
-- First, check if there are any existing records and warn about data loss
DO $$ 
DECLARE 
    record_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count FROM recorded_sessions;
    IF record_count > 0 THEN
        RAISE NOTICE 'Found % existing recorded_sessions records. These will be preserved if course_id can be converted to integer.', record_count;
    END IF;
END $$;

-- Attempt to convert UUID course_id to INTEGER
-- This will fail if there are UUIDs that can't be converted to integers
-- If this fails, you may need to manually clean up the data first
ALTER TABLE recorded_sessions ALTER COLUMN course_id TYPE INTEGER USING (
    CASE 
        WHEN course_id ~ '^[0-9]+$' THEN course_id::INTEGER
        ELSE NULL  -- This will cause constraint violation if NOT NULL, but preserves data integrity
    END
);

-- Step 3: Add foreign key constraint to reference courses.id
ALTER TABLE recorded_sessions 
ADD CONSTRAINT recorded_sessions_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- Step 4: Update the comment to reflect the new type
COMMENT ON COLUMN recorded_sessions.course_id IS 'Foreign key to the courses table (integer ID)';

COMMIT;