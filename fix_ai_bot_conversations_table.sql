-- Fix ai_bot_conversations table - Add missing columns

-- Add missing columns to ai_bot_conversations table
ALTER TABLE ai_bot_conversations 
ADD COLUMN IF NOT EXISTS message_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS context_used TEXT,
ADD COLUMN IF NOT EXISTS learning_insights TEXT,
ADD COLUMN IF NOT EXISTS student_engagement_score DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS follow_up_suggestions TEXT[],
ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS topic_tags TEXT[],
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create an index on message_order for better performance
CREATE INDEX IF NOT EXISTS idx_ai_bot_conversations_message_order 
ON ai_bot_conversations (session_id, message_order);

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ai_bot_conversations' 
ORDER BY ordinal_position;