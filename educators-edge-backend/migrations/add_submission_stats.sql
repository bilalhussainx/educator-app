-- Migration: Add student performance stats to submissions table
-- This adds columns to track student performance metrics

ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS mastery_level INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS code_churn INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS copy_paste_activity INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS time_taken INTEGER DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN submissions.mastery_level IS 'Student mastery level score (0-100)';
COMMENT ON COLUMN submissions.code_churn IS 'Number of code changes/edits made during submission';
COMMENT ON COLUMN submissions.copy_paste_activity IS 'Percentage of code that was copy-pasted (0-100)';
COMMENT ON COLUMN submissions.time_taken IS 'Time in minutes to complete the submission';