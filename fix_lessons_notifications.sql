-- Fix lessons table - add missing columns
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS estimated_duration INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Fix notifications table - add missing columns and rename teacher_id to user_id
-- First add missing columns
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS title VARCHAR(200),
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- Rename teacher_id to user_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        ALTER TABLE notifications RENAME COLUMN teacher_id TO user_id;
    END IF;
END $$;

-- Verify the changes
SELECT 'lessons table columns' as table_info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lessons' AND column_name IN ('difficulty_level', 'content_type', 'estimated_duration', 'is_active')
ORDER BY column_name;

SELECT 'notifications table columns' as table_info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY column_name;