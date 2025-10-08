-- =================================================================
-- ELITE SUBMISSIONS TRACKING SYSTEM - DATABASE SCHEMA
-- =================================================================

-- Create submissions table for tracking all user attempts
CREATE TABLE IF NOT EXISTS user_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Enhanced course identification
    course_id UUID NOT NULL,
    course_title TEXT NOT NULL,
    module_index INTEGER NOT NULL,
    lesson_index INTEGER NOT NULL,
    lesson_title TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'javascript',

    -- Submission details
    submitted_code TEXT NOT NULL,
    submission_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Test results and scoring
    tests_passed INTEGER NOT NULL DEFAULT 0,
    total_tests INTEGER NOT NULL DEFAULT 0,
    pass_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_tests > 0 THEN ROUND((tests_passed::DECIMAL / total_tests::DECIMAL) * 100, 2)
            ELSE 0
        END
    ) STORED,

    -- Performance metrics
    execution_time_ms INTEGER,
    memory_usage_mb DECIMAL(10,2),

    -- Success tracking
    is_solved BOOLEAN DEFAULT FALSE,
    attempts_count INTEGER DEFAULT 1,
    first_solve_time TIMESTAMP WITH TIME ZONE,

    -- Code quality metrics
    lines_of_code INTEGER,
    code_complexity_score DECIMAL(5,2),

    -- Additional metadata
    submission_metadata JSONB DEFAULT '{}',

    -- Indexes for performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user progress summary table
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL,

    -- Progress metrics
    total_lessons INTEGER DEFAULT 0,
    completed_lessons INTEGER DEFAULT 0,
    completion_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_lessons > 0 THEN ROUND((completed_lessons::DECIMAL / total_lessons::DECIMAL) * 100, 2)
            ELSE 0
        END
    ) STORED,

    -- Performance summary
    average_score DECIMAL(5,2) DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    solved_problems INTEGER DEFAULT 0,

    -- Streaks and achievements
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,

    -- Time tracking
    total_time_spent_minutes INTEGER DEFAULT 0,
    average_solve_time_minutes DECIMAL(10,2) DEFAULT 0,

    -- Course-specific stats
    favorite_language TEXT,
    language_stats JSONB DEFAULT '{}',

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint to prevent duplicates
    UNIQUE(user_id, course_id)
);

-- Create problem difficulty and tags table for enhanced categorization
CREATE TABLE IF NOT EXISTS problem_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    module_index INTEGER NOT NULL,
    lesson_index INTEGER NOT NULL,

    -- Difficulty and categorization
    difficulty_level TEXT CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard', 'Expert')),
    problem_tags TEXT[] DEFAULT '{}',
    estimated_time_minutes INTEGER DEFAULT 30,

    -- Success statistics across all users
    total_attempts INTEGER DEFAULT 0,
    successful_submissions INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_attempts > 0 THEN ROUND((successful_submissions::DECIMAL / total_attempts::DECIMAL) * 100, 2)
            ELSE 0
        END
    ) STORED,

    -- Average metrics
    average_solve_time_minutes DECIMAL(10,2) DEFAULT 0,
    average_attempts DECIMAL(5,2) DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(course_id, module_index, lesson_index)
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_user_submissions_user_id ON user_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_submissions_course_id ON user_submissions(course_id);
CREATE INDEX IF NOT EXISTS idx_user_submissions_solved ON user_submissions(user_id, is_solved);
CREATE INDEX IF NOT EXISTS idx_user_submissions_time ON user_submissions(submission_time DESC);
CREATE INDEX IF NOT EXISTS idx_user_submissions_composite ON user_submissions(user_id, course_id, module_index, lesson_index);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_course_id ON user_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completion ON user_progress(completion_percentage DESC);

CREATE INDEX IF NOT EXISTS idx_problem_metadata_course ON problem_metadata(course_id, module_index, lesson_index);
CREATE INDEX IF NOT EXISTS idx_problem_metadata_difficulty ON problem_metadata(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_problem_metadata_success_rate ON problem_metadata(success_rate DESC);

-- Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_user_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user progress when a submission is successful
    IF NEW.is_solved = TRUE AND (OLD.is_solved IS NULL OR OLD.is_solved = FALSE) THEN
        INSERT INTO user_progress (user_id, course_id, solved_problems, total_submissions)
        VALUES (NEW.user_id, NEW.course_id, 1, 1)
        ON CONFLICT (user_id, course_id)
        DO UPDATE SET
            solved_problems = user_progress.solved_problems + 1,
            total_submissions = user_progress.total_submissions + 1,
            last_activity = NOW(),
            updated_at = NOW();
    ELSE
        -- Just increment total submissions
        INSERT INTO user_progress (user_id, course_id, total_submissions)
        VALUES (NEW.user_id, NEW.course_id, 1)
        ON CONFLICT (user_id, course_id)
        DO UPDATE SET
            total_submissions = user_progress.total_submissions + 1,
            last_activity = NOW(),
            updated_at = NOW();
    END IF;

    -- Update problem metadata statistics
    INSERT INTO problem_metadata (course_id, module_index, lesson_index, total_attempts, successful_submissions)
    VALUES (NEW.course_id, NEW.module_index, NEW.lesson_index, 1, CASE WHEN NEW.is_solved THEN 1 ELSE 0 END)
    ON CONFLICT (course_id, module_index, lesson_index)
    DO UPDATE SET
        total_attempts = problem_metadata.total_attempts + 1,
        successful_submissions = problem_metadata.successful_submissions + CASE WHEN NEW.is_solved THEN 1 ELSE 0 END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic progress updates
DROP TRIGGER IF EXISTS trigger_update_user_progress ON user_submissions;
CREATE TRIGGER trigger_update_user_progress
    AFTER INSERT ON user_submissions
    FOR EACH ROW EXECUTE FUNCTION update_user_progress();

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update timestamp triggers
DROP TRIGGER IF EXISTS trigger_user_submissions_updated_at ON user_submissions;
CREATE TRIGGER trigger_user_submissions_updated_at
    BEFORE UPDATE ON user_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_user_progress_updated_at ON user_progress;
CREATE TRIGGER trigger_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_problem_metadata_updated_at ON problem_metadata;
CREATE TRIGGER trigger_problem_metadata_updated_at
    BEFORE UPDATE ON problem_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();