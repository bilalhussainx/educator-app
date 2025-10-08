-- Enhanced calendar functionality for TrustGraph
-- This adds comprehensive calendar and availability management

-- Teacher availability windows (recurring schedule)
CREATE TABLE IF NOT EXISTS teacher_availability (
    id SERIAL PRIMARY KEY,
    teacher_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    session_duration INTEGER DEFAULT 60, -- default session length in minutes
    buffer_time INTEGER DEFAULT 15, -- buffer between sessions in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Specific time slots (for one-off availability or overrides)
CREATE TABLE IF NOT EXISTS teacher_time_slots (
    id SERIAL PRIMARY KEY,
    teacher_id UUID NOT NULL,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
    session_id INTEGER NULL, -- links to sessions table when booked
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calendar preferences and settings for teachers
CREATE TABLE IF NOT EXISTS teacher_calendar_settings (
    id SERIAL PRIMARY KEY,
    teacher_id UUID UNIQUE NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    min_notice_hours INTEGER DEFAULT 24, -- minimum hours notice required for booking
    max_advance_days INTEGER DEFAULT 30, -- maximum days in advance bookings allowed
    default_session_duration INTEGER DEFAULT 60,
    auto_accept_bookings BOOLEAN DEFAULT false,
    calendar_color VARCHAR(7) DEFAULT '#3B82F6', -- hex color code
    booking_instructions TEXT,
    cancellation_policy TEXT,
    is_calendar_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add calendar-related columns to existing session_requests table
DO $$
BEGIN
    -- Add preferred_datetime column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_requests' AND column_name = 'preferred_datetime'
    ) THEN
        ALTER TABLE session_requests ADD COLUMN preferred_datetime TIMESTAMP;
    END IF;
    
    -- Add duration column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_requests' AND column_name = 'duration_minutes'
    ) THEN
        ALTER TABLE session_requests ADD COLUMN duration_minutes INTEGER DEFAULT 60;
    END IF;
    
    -- Add timezone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_requests' AND column_name = 'timezone'
    ) THEN
        ALTER TABLE session_requests ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
    END IF;
    
    -- Add time_slot_id to link to specific time slots
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'session_requests' AND column_name = 'time_slot_id'
    ) THEN
        ALTER TABLE session_requests ADD COLUMN time_slot_id INTEGER;
    END IF;
END
$$;

-- Add foreign key constraints
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Teacher availability foreign keys
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'teacher_availability_teacher_id_fkey'
        ) THEN
            ALTER TABLE teacher_availability ADD CONSTRAINT teacher_availability_teacher_id_fkey 
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        
        -- Teacher time slots foreign keys
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'teacher_time_slots_teacher_id_fkey'
        ) THEN
            ALTER TABLE teacher_time_slots ADD CONSTRAINT teacher_time_slots_teacher_id_fkey 
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        
        -- Calendar settings foreign keys
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'teacher_calendar_settings_teacher_id_fkey'
        ) THEN
            ALTER TABLE teacher_calendar_settings ADD CONSTRAINT teacher_calendar_settings_teacher_id_fkey 
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    -- Link time slots to sessions if sessions table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sessions') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'teacher_time_slots_session_id_fkey'
        ) THEN
            ALTER TABLE teacher_time_slots ADD CONSTRAINT teacher_time_slots_session_id_fkey 
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL;
        END IF;
        
        -- Link session requests to time slots
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'session_requests_time_slot_id_fkey'
        ) THEN
            ALTER TABLE session_requests ADD CONSTRAINT session_requests_time_slot_id_fkey 
                FOREIGN KEY (time_slot_id) REFERENCES teacher_time_slots(id) ON DELETE SET NULL;
        END IF;
    END IF;
END
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teacher_availability_teacher_id ON teacher_availability(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_availability_day_of_week ON teacher_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_teacher_time_slots_teacher_id ON teacher_time_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_time_slots_datetime ON teacher_time_slots(start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_teacher_time_slots_status ON teacher_time_slots(status);
CREATE INDEX IF NOT EXISTS idx_teacher_calendar_settings_teacher_id ON teacher_calendar_settings(teacher_id);

-- Create trigger for updated_at columns
DROP TRIGGER IF EXISTS update_teacher_availability_updated_at ON teacher_availability;
CREATE TRIGGER update_teacher_availability_updated_at 
    BEFORE UPDATE ON teacher_availability
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_time_slots_updated_at ON teacher_time_slots;
CREATE TRIGGER update_teacher_time_slots_updated_at 
    BEFORE UPDATE ON teacher_time_slots
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_calendar_settings_updated_at ON teacher_calendar_settings;
CREATE TRIGGER update_teacher_calendar_settings_updated_at 
    BEFORE UPDATE ON teacher_calendar_settings
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default calendar settings for existing teachers/mentors
INSERT INTO teacher_calendar_settings (teacher_id, timezone, min_notice_hours, max_advance_days)
SELECT DISTINCT u.id, 'UTC', 24, 30
FROM users u 
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE (u.role = 'teacher' OR up.is_mentor = true OR up.is_searchable_teacher = true)
AND NOT EXISTS (
    SELECT 1 FROM teacher_calendar_settings tcs WHERE tcs.teacher_id = u.id
);

-- Display what was created
\echo 'Calendar schema created successfully!'
\echo 'Tables created:'
\echo '- teacher_availability: Recurring weekly availability schedules'
\echo '- teacher_time_slots: Specific available time slots and bookings'
\echo '- teacher_calendar_settings: Individual teacher calendar preferences'
\echo 'Enhanced session_requests with calendar fields'