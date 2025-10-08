-- Add Calendly integration fields to user profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS calendly_access_token TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS calendly_user_uri TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS calendly_organization_uri TEXT;

-- Add unique user ID field for session management (like email but for internal system)
ALTER TABLE users ADD COLUMN IF NOT EXISTS unique_session_id VARCHAR(50) UNIQUE;

-- Add session flow status tracking
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS flow_status TEXT DEFAULT 'requested';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS flow_status TEXT DEFAULT 'scheduled';

-- Create unique session IDs for existing users (format: first3letters + last4digits of id)
UPDATE users 
SET unique_session_id = LOWER(LEFT(COALESCE(username, email, 'usr'), 3)) || LPAD(CAST(id AS TEXT), 4, '0')
WHERE unique_session_id IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_unique_session_id ON users(unique_session_id);

-- Update flow status for existing records
UPDATE session_requests 
SET flow_status = CASE 
    WHEN status = 'pending' THEN 'requested'
    WHEN status = 'accepted' THEN 'accepted'
    WHEN status = 'declined' THEN 'declined'
    ELSE 'requested'
END
WHERE flow_status IS NULL;

UPDATE sessions 
SET flow_status = CASE 
    WHEN status = 'scheduled' THEN 'confirmed'
    WHEN status = 'active' THEN 'in_progress'
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'confirmed'
END
WHERE flow_status IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN user_profiles.calendly_access_token IS 'Personal access token for Calendly API';
COMMENT ON COLUMN user_profiles.calendly_user_uri IS 'Calendly user URI from API';
COMMENT ON COLUMN user_profiles.calendly_organization_uri IS 'Calendly organization URI from API';
COMMENT ON COLUMN users.unique_session_id IS 'Unique identifier for session requests (like bil0001)';
COMMENT ON COLUMN session_requests.flow_status IS 'Current status in the session request flow';
COMMENT ON COLUMN sessions.flow_status IS 'Current status in the session flow';