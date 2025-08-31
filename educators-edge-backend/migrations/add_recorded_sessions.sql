-- Migration: Add recorded_sessions table for the Live to Library pipeline
-- This table tracks recorded live tutorial sessions and their processing status

CREATE TABLE IF NOT EXISTS recorded_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled Recording',
    description TEXT,
    video_url VARCHAR(500),
    transcript TEXT,
    ai_summary TEXT,
    ai_topics TEXT[],
    processing_status VARCHAR(50) NOT NULL DEFAULT 'processing' 
        CHECK (processing_status IN ('processing', 'transcribing', 'enriching', 'completed', 'failed')),
    agora_channel_name VARCHAR(255),
    agora_recording_resource_id VARCHAR(255),
    agora_recording_sid VARCHAR(255),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_recorded_sessions_course_id ON recorded_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_recorded_sessions_teacher_id ON recorded_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_recorded_sessions_status ON recorded_sessions(processing_status);
CREATE INDEX IF NOT EXISTS idx_recorded_sessions_recorded_at ON recorded_sessions(recorded_at DESC);

-- Add comments for documentation
COMMENT ON TABLE recorded_sessions IS 'Stores recorded live tutorial sessions with AI enrichment data';
COMMENT ON COLUMN recorded_sessions.course_id IS 'Foreign key to the courses table';
COMMENT ON COLUMN recorded_sessions.teacher_id IS 'Foreign key to the users table (teacher who recorded)';
COMMENT ON COLUMN recorded_sessions.title IS 'Teacher-editable title for the recording';
COMMENT ON COLUMN recorded_sessions.description IS 'Teacher-editable description/notes';
COMMENT ON COLUMN recorded_sessions.video_url IS 'Secure, playable URL for the video in S3/CloudFront';
COMMENT ON COLUMN recorded_sessions.transcript IS 'Full text transcript from speech-to-text API';
COMMENT ON COLUMN recorded_sessions.ai_summary IS 'AI-generated summary of the session content';
COMMENT ON COLUMN recorded_sessions.ai_topics IS 'Array of keywords/topics extracted by AI';
COMMENT ON COLUMN recorded_sessions.processing_status IS 'Current processing state of the recording';
COMMENT ON COLUMN recorded_sessions.agora_channel_name IS 'Agora channel name used for recording';
COMMENT ON COLUMN recorded_sessions.agora_recording_resource_id IS 'Agora Cloud Recording resource ID';
COMMENT ON COLUMN recorded_sessions.agora_recording_sid IS 'Agora Cloud Recording SID';