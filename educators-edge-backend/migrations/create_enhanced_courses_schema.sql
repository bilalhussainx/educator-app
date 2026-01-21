-- Enhanced Courses Database Schema
-- Run this to create the tables needed for enhanced courses to appear in discover tab

-- 1. Create enhanced_courses table
CREATE TABLE IF NOT EXISTS enhanced_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    difficulty_level VARCHAR(20) DEFAULT 'intermediate',
    estimated_duration VARCHAR(50),
    target_audience TEXT,
    learning_outcomes JSONB DEFAULT '[]',
    prerequisites JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    language VARCHAR(50) DEFAULT 'javascript',
    course_type VARCHAR(50) DEFAULT 'premium',
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create enhanced_course_enrollments table
CREATE TABLE IF NOT EXISTS enhanced_course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES enhanced_courses(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT NOW(),
    progress JSONB DEFAULT '{}',
    completion_status VARCHAR(20) DEFAULT 'in_progress',
    UNIQUE(course_id, student_id)
);

-- 3. Create ai_tutors table for enhanced courses
CREATE TABLE IF NOT EXISTS ai_tutors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES enhanced_courses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    personality TEXT,
    specialization JSONB DEFAULT '[]',
    teaching_style TEXT,
    response_patterns JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create course_generation_logs table for tracking
CREATE TABLE IF NOT EXISTS course_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_type VARCHAR(50) NOT NULL,
    input_parameters JSONB,
    generated_course_id UUID REFERENCES enhanced_courses(id),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enhanced_courses_published ON enhanced_courses(is_published, created_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_courses_teacher ON enhanced_courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_enrollments_student ON enhanced_course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_enrollments_course ON enhanced_course_enrollments(course_id);

-- 6. Migrate existing courses from regular courses table to enhanced_courses
-- This will move any courses created by the UltimateCourseGenerator to the enhanced_courses table
INSERT INTO enhanced_courses (
    title, 
    description, 
    teacher_id, 
    difficulty_level,
    language,
    course_type,
    is_published,
    created_at
)
SELECT 
    title,
    description,
    teacher_id,
    'intermediate' as difficulty_level,
    'javascript' as language,
    'premium' as course_type,
    is_published,
    created_at
FROM courses 
WHERE title LIKE '%Mastering Coding Interviews%'
   OR title LIKE '%Pattern-Based Problem Solving%'
   OR title LIKE '%System Design%'
   OR title LIKE '%Dynamic Programming%'
   OR title LIKE '%Data Structures%'
   OR description LIKE '%AI-generated%'
   OR description LIKE '%premium%'
ON CONFLICT DO NOTHING;

-- 7. Update publication status for migrated courses to make them discoverable
UPDATE enhanced_courses 
SET is_published = true, 
    updated_at = NOW()
WHERE is_published = false;

-- 8. Show results
SELECT 
    id,
    title,
    teacher_id,
    course_type,
    is_published,
    created_at
FROM enhanced_courses
ORDER BY created_at DESC;