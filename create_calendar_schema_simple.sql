-- Simplified calendar schema that works with existing session_requests table
-- This creates only essential calendar tables without conflicting foreign keys

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
    session_request_id UUID NULL, -- links to session_requests table when booked
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teacher_availability_teacher_id ON teacher_availability(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_availability_day_of_week ON teacher_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_teacher_time_slots_teacher_id ON teacher_time_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_time_slots_datetime ON teacher_time_slots(start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_teacher_time_slots_status ON teacher_time_slots(status);
CREATE INDEX IF NOT EXISTS idx_teacher_calendar_settings_teacher_id ON teacher_calendar_settings(teacher_id);

-- Create trigger for updated_at columns (only if function exists)
DO $$
BEGIN
    -- Check if function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        -- Create triggers
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
    END IF;
END
$$;

-- Insert default calendar settings for existing teachers/mentors
DO $$
BEGIN
    INSERT INTO teacher_calendar_settings (teacher_id, timezone, min_notice_hours, max_advance_days)
    SELECT DISTINCT u.id, 'UTC', 24, 30
    FROM users u 
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE (u.role = 'teacher' OR up.is_mentor = true OR up.is_searchable_teacher = true)
    AND NOT EXISTS (
        SELECT 1 FROM teacher_calendar_settings tcs WHERE tcs.teacher_id = u.id
    );
END
$$;

SELECT 'Calendar schema created successfully!' as message;