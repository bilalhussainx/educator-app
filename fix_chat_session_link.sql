-- Add chat_session_id column to link urgent sessions with AI bot chat sessions
ALTER TABLE session_requests 
ADD COLUMN IF NOT EXISTS chat_session_id UUID;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'session_requests' AND column_name = 'chat_session_id';