-- Add missing columns to ai_bot_sessions table
ALTER TABLE ai_bot_sessions 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS student_satisfaction INTEGER,
ADD COLUMN IF NOT EXISTS learning_objectives_met BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS solution_provided TEXT,
ADD COLUMN IF NOT EXISTS learning_progress JSON,
ADD COLUMN IF NOT EXISTS code_reviewed TEXT,
ADD COLUMN IF NOT EXISTS response_accuracy INTEGER,
ADD COLUMN IF NOT EXISTS helpfulness_rating INTEGER,
ADD COLUMN IF NOT EXISTS ai_confidence_level DECIMAL(3,2);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_bot_sessions' AND column_name IN (
  'started_at', 'ended_at', 'duration_minutes', 'student_satisfaction', 
  'learning_objectives_met', 'solution_provided', 'learning_progress',
  'code_reviewed', 'response_accuracy', 'helpfulness_rating', 'ai_confidence_level'
)
ORDER BY column_name;