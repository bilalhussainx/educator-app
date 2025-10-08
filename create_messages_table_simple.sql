-- Create messages table for teacher-student communication (simplified)
-- Drop table if exists to recreate properly
DROP TABLE IF EXISTS messages CASCADE;

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    session_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP NULL
);

-- Add check constraint to prevent self-messaging
ALTER TABLE messages ADD CONSTRAINT messages_not_self CHECK (from_user_id != to_user_id);

-- Create indexes for better performance
CREATE INDEX idx_messages_from_user ON messages(from_user_id);
CREATE INDEX idx_messages_to_user ON messages(to_user_id);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_conversation ON messages(from_user_id, to_user_id, created_at);

-- Update sessions table to include additional tracking fields
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_notes TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_url TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS agora_channel TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS agora_token TEXT;

-- Update session_requests table to include scheduling info
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS calendly_event_uri TEXT;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS calendly_booking_url TEXT;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS booking_method TEXT DEFAULT 'manual';

-- Insert some sample messages for testing (if users exist)
INSERT INTO messages (from_user_id, to_user_id, message, created_at) 
SELECT 1, 2, 'Hello! I have a question about our upcoming session.', NOW() - INTERVAL '1 hour'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1) 
  AND EXISTS (SELECT 1 FROM users WHERE id = 2)
  AND NOT EXISTS (SELECT 1 FROM messages WHERE from_user_id = 1 AND to_user_id = 2);

INSERT INTO messages (from_user_id, to_user_id, message, created_at) 
SELECT 2, 1, 'Of course! Feel free to ask me anything. I''ll be happy to help.', NOW() - INTERVAL '30 minutes'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1) 
  AND EXISTS (SELECT 1 FROM users WHERE id = 2)
  AND NOT EXISTS (SELECT 1 FROM messages WHERE from_user_id = 2 AND to_user_id = 1);

COMMENT ON TABLE messages IS 'Messages between teachers and students for session communication';
COMMENT ON COLUMN messages.from_user_id IS 'ID of the user sending the message';
COMMENT ON COLUMN messages.to_user_id IS 'ID of the user receiving the message';
COMMENT ON COLUMN messages.session_id IS 'Optional reference to related session';
COMMENT ON COLUMN messages.read_at IS 'Timestamp when message was marked as read';