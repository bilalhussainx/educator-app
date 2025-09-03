-- Migration: Add recording_type column to track different recording methods
-- This allows us to distinguish between webcam recordings and web page recordings

ALTER TABLE recorded_sessions 
ADD COLUMN IF NOT EXISTS recording_type VARCHAR(50) DEFAULT 'video' CHECK (recording_type IN ('video', 'web_page', 'screen_share'));

-- Update existing records to have 'video' type
UPDATE recorded_sessions 
SET recording_type = 'video' 
WHERE recording_type IS NULL;

-- Add index for faster querying by recording type
CREATE INDEX IF NOT EXISTS idx_recorded_sessions_recording_type ON recorded_sessions(recording_type);

-- Add comment for clarity
COMMENT ON COLUMN recorded_sessions.recording_type IS 'Type of recording: video (webcam), web_page (educational content), screen_share';