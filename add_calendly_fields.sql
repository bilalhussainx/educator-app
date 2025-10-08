-- Add Calendly integration fields to session_requests table
-- This enhances the existing session system with professional Calendly booking

-- Add Calendly-specific columns to session_requests
ALTER TABLE session_requests 
ADD COLUMN IF NOT EXISTS calendly_event_uri VARCHAR(500),
ADD COLUMN IF NOT EXISTS calendly_booking_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS booking_method VARCHAR(50) DEFAULT 'manual';

-- Add Calendly URL to user profiles so mentors can set their Calendly links
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS calendly_url VARCHAR(500);

-- Create index for faster lookups of Calendly bookings
CREATE INDEX IF NOT EXISTS idx_session_requests_calendly_event 
ON session_requests(calendly_event_uri) 
WHERE calendly_event_uri IS NOT NULL;

-- Add booking method index for analytics
CREATE INDEX IF NOT EXISTS idx_session_requests_booking_method 
ON session_requests(booking_method);

-- Update existing requests to have manual booking method
UPDATE session_requests 
SET booking_method = 'manual' 
WHERE booking_method IS NULL;

-- Add a check constraint to ensure valid booking methods
-- Note: PostgreSQL doesn't support IF NOT EXISTS for constraints, so we handle this separately
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_table_usage 
        WHERE constraint_name = 'chk_booking_method' 
        AND table_name = 'session_requests'
    ) THEN
        ALTER TABLE session_requests 
        ADD CONSTRAINT chk_booking_method 
        CHECK (booking_method IN ('manual', 'calendly', 'google_calendar', 'outlook'));
    END IF;
END $$;

COMMENT ON COLUMN session_requests.calendly_event_uri IS 'Calendly event URI when booked through Calendly';
COMMENT ON COLUMN session_requests.calendly_booking_url IS 'Direct link to the Calendly booking';
COMMENT ON COLUMN session_requests.booking_method IS 'Method used to book the session: manual, calendly, etc.';
COMMENT ON COLUMN user_profiles.calendly_url IS 'User''s Calendly scheduling link for professional booking';