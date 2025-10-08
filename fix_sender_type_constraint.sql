-- Fix sender_type check constraint to allow 'ai_bot'

-- Drop the existing check constraint
ALTER TABLE ai_bot_conversations 
DROP CONSTRAINT IF EXISTS ai_bot_conversations_sender_type_check;

-- Add a new check constraint that allows 'human', 'ai', and 'ai_bot'
ALTER TABLE ai_bot_conversations 
ADD CONSTRAINT ai_bot_conversations_sender_type_check 
CHECK (sender_type IN ('human', 'ai', 'ai_bot', 'system'));

-- Verify the constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'ai_bot_conversations'::regclass 
AND contype = 'c';