-- Add Calendly fields if they don't exist
DO $$ 
BEGIN
    -- Add calendly_event_uri column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_requests' 
        AND column_name = 'calendly_event_uri'
    ) THEN
        ALTER TABLE session_requests ADD COLUMN calendly_event_uri VARCHAR(500);
    END IF;
    
    -- Add calendly_booking_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_requests' 
        AND column_name = 'calendly_booking_url'
    ) THEN
        ALTER TABLE session_requests ADD COLUMN calendly_booking_url VARCHAR(500);
    END IF;
    
    -- Add booking_method column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_requests' 
        AND column_name = 'booking_method'
    ) THEN
        ALTER TABLE session_requests ADD COLUMN booking_method VARCHAR(50) DEFAULT 'manual';
    END IF;
    
    -- Add calendly_url to user_profiles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'calendly_url'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN calendly_url VARCHAR(500);
    END IF;
END $$;