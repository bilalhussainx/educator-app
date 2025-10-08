-- Create messages table for teacher-student communication
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    session_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP NULL,
    CONSTRAINT messages_not_self CHECK (from_user_id != to_user_id)
);

-- Add foreign key constraints separately after table creation
DO $$
BEGIN
    -- Add foreign key for from_user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_from_user_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages ADD CONSTRAINT messages_from_user_id_fkey 
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key for to_user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_to_user_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages ADD CONSTRAINT messages_to_user_id_fkey 
        FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key for session_id if sessions table exists and constraint doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_session_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages ADD CONSTRAINT messages_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(from_user_id, to_user_id, created_at);

-- Add read status tracking to sessions table if not exists
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_notes TEXT;

-- Update session_requests table to include scheduling info if not exists
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP;