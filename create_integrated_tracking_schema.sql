-- =================================================================
-- INTEGRATED EDUCATORS ECOSYSTEM TRACKING SYSTEM
-- Connects: Zenith Trade Terminal, LeetCode Courses, Personal Sessions, Teacher Rankings
-- =================================================================

-- Enhanced user profile with integrated metrics
CREATE TABLE IF NOT EXISTS user_ecosystem_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Zenith Trade Terminal Integration
    p_score DECIMAL(12,2) DEFAULT 0.00,
    total_portfolio_value DECIMAL(15,2) DEFAULT 0.00,
    trading_level TEXT DEFAULT 'Beginner' CHECK (trading_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master')),
    successful_trades INTEGER DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_trades > 0 THEN ROUND((successful_trades::DECIMAL / total_trades::DECIMAL) * 100, 2)
            ELSE 0
        END
    ) STORED,

    -- Sparks System (Achievement/Reward Points)
    total_sparks INTEGER DEFAULT 0,
    sparks_this_month INTEGER DEFAULT 0,
    sparks_lifetime INTEGER DEFAULT 0,
    spark_level TEXT DEFAULT 'Novice' CHECK (spark_level IN ('Novice', 'Rising', 'Bright', 'Brilliant', 'Luminous', 'Radiant')),

    -- Learning Progress Integration
    total_problems_solved INTEGER DEFAULT 0,
    total_courses_completed INTEGER DEFAULT 0,
    coding_streak_days INTEGER DEFAULT 0,
    longest_coding_streak INTEGER DEFAULT 0,
    favorite_programming_language TEXT,

    -- Session & Teaching Metrics
    sessions_scheduled INTEGER DEFAULT 0,
    sessions_completed INTEGER DEFAULT 0,
    sessions_as_student INTEGER DEFAULT 0,
    sessions_as_teacher INTEGER DEFAULT 0,
    average_session_rating DECIMAL(3,2) DEFAULT 0.00,

    -- Teacher Performance (if user is a teacher)
    is_teacher BOOLEAN DEFAULT FALSE,
    teacher_rating DECIMAL(3,2) DEFAULT 0.00,
    total_students_taught INTEGER DEFAULT 0,
    total_teaching_hours DECIMAL(10,2) DEFAULT 0.00,
    teaching_specialties TEXT[] DEFAULT '{}',

    -- Composite Scores
    overall_ecosystem_score INTEGER GENERATED ALWAYS AS (
        LEAST(1000,
            COALESCE(ROUND(p_score / 100), 0) +
            COALESCE(total_sparks / 10, 0) +
            COALESCE(total_problems_solved * 2, 0) +
            COALESCE(coding_streak_days, 0) +
            COALESCE(sessions_completed * 5, 0) +
            COALESCE(ROUND(teacher_rating * 50), 0)
        )
    ) STORED,

    -- Activity tracking
    last_trade_activity TIMESTAMP WITH TIME ZONE,
    last_coding_activity TIMESTAMP WITH TIME ZONE,
    last_session_activity TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced submissions table with ecosystem integration
ALTER TABLE user_submissions ADD COLUMN IF NOT EXISTS sparks_earned INTEGER DEFAULT 0;
ALTER TABLE user_submissions ADD COLUMN IF NOT EXISTS p_score_impact DECIMAL(8,2) DEFAULT 0.00;
ALTER TABLE user_submissions ADD COLUMN IF NOT EXISTS ecosystem_bonus_points INTEGER DEFAULT 0;

-- Session management and teacher ratings
CREATE TABLE IF NOT EXISTS session_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session details
    session_title TEXT NOT NULL,
    session_description TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    session_type TEXT DEFAULT 'coding' CHECK (session_type IN ('coding', 'trading', 'career', 'project', 'interview_prep')),

    -- Status tracking
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),

    -- Session results
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    session_notes TEXT,
    homework_assigned TEXT,

    -- Ratings and feedback
    student_rating INTEGER CHECK (student_rating BETWEEN 1 AND 5),
    teacher_rating INTEGER CHECK (teacher_rating BETWEEN 1 AND 5),
    student_feedback TEXT,
    teacher_feedback TEXT,

    -- Rewards and achievements
    sparks_awarded INTEGER DEFAULT 0,
    achievements_unlocked TEXT[] DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sparks earning history
CREATE TABLE IF NOT EXISTS sparks_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'penalty')),
    amount INTEGER NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('coding_solved', 'trading_profit', 'session_completed', 'streak_bonus', 'teacher_rating', 'course_completion', 'special_event')),

    -- Reference information
    reference_id UUID, -- Could reference submission, session, trade, etc.
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',

    transaction_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher performance tracking
CREATE TABLE IF NOT EXISTS teacher_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES session_bookings(id) ON DELETE SET NULL,

    -- Detailed ratings
    communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
    knowledge_rating INTEGER CHECK (knowledge_rating BETWEEN 1 AND 5),
    preparation_rating INTEGER CHECK (preparation_rating BETWEEN 1 AND 5),
    helpfulness_rating INTEGER CHECK (helpfulness_rating BETWEEN 1 AND 5),
    overall_rating DECIMAL(3,2) GENERATED ALWAYS AS (
        ROUND((communication_rating + knowledge_rating + preparation_rating + helpfulness_rating) / 4.0, 2)
    ) STORED,

    -- Feedback
    written_feedback TEXT,
    would_recommend BOOLEAN DEFAULT TRUE,

    -- Tags and categories
    session_tags TEXT[] DEFAULT '{}',
    improvement_suggestions TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievement system
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    achievement_type TEXT NOT NULL,
    achievement_title TEXT NOT NULL,
    achievement_description TEXT NOT NULL,
    achievement_icon TEXT DEFAULT '🏆',

    -- Requirements and progress
    requirement_met BOOLEAN DEFAULT TRUE,
    progress_current INTEGER DEFAULT 0,
    progress_target INTEGER DEFAULT 1,

    -- Rewards
    sparks_reward INTEGER DEFAULT 0,
    p_score_bonus DECIMAL(8,2) DEFAULT 0.00,

    -- Metadata
    category TEXT DEFAULT 'general' CHECK (category IN ('coding', 'trading', 'teaching', 'learning', 'social', 'special')),
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint to prevent duplicate achievements
    UNIQUE(user_id, achievement_type)
);

-- Leaderboards and rankings
CREATE TABLE IF NOT EXISTS ecosystem_leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Different ranking categories
    coding_rank INTEGER,
    trading_rank INTEGER,
    teaching_rank INTEGER,
    overall_rank INTEGER,

    -- Monthly rankings
    monthly_coding_rank INTEGER,
    monthly_trading_rank INTEGER,
    monthly_teaching_rank INTEGER,

    -- Scores for ranking calculation
    coding_score INTEGER DEFAULT 0,
    trading_score INTEGER DEFAULT 0,
    teaching_score INTEGER DEFAULT 0,
    ecosystem_score INTEGER DEFAULT 0,

    -- Time period
    ranking_period TEXT DEFAULT 'current' CHECK (ranking_period IN ('current', 'monthly', 'weekly')),
    period_start DATE DEFAULT CURRENT_DATE,
    period_end DATE DEFAULT CURRENT_DATE + INTERVAL '1 month',

    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_ecosystem_profile_user_id ON user_ecosystem_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ecosystem_profile_score ON user_ecosystem_profile(overall_ecosystem_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_ecosystem_profile_sparks ON user_ecosystem_profile(total_sparks DESC);

CREATE INDEX IF NOT EXISTS idx_session_bookings_student ON session_bookings(student_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_session_bookings_teacher ON session_bookings(teacher_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_session_bookings_status ON session_bookings(status, scheduled_time);

CREATE INDEX IF NOT EXISTS idx_sparks_transactions_user ON sparks_transactions(user_id, transaction_time DESC);
CREATE INDEX IF NOT EXISTS idx_sparks_transactions_type ON sparks_transactions(transaction_type, source_type);

CREATE INDEX IF NOT EXISTS idx_teacher_ratings_teacher ON teacher_ratings(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_ratings_overall ON teacher_ratings(overall_rating DESC);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id, category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON user_achievements(rarity, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboards_overall ON ecosystem_leaderboards(overall_rank ASC) WHERE overall_rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leaderboards_period ON ecosystem_leaderboards(ranking_period, period_start, period_end);

-- Functions for automatic ecosystem updates
CREATE OR REPLACE FUNCTION update_ecosystem_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize profile if doesn't exist
    INSERT INTO user_ecosystem_profile (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Update coding metrics when a problem is solved
    IF TG_TABLE_NAME = 'user_submissions' AND NEW.is_solved = TRUE THEN
        -- Calculate sparks earned based on difficulty and performance
        DECLARE
            sparks_earned INTEGER := 0;
            p_score_bonus DECIMAL(8,2) := 0.00;
            ecosystem_bonus INTEGER := 0;
        BEGIN
            -- Base sparks for solving
            sparks_earned := 10;

            -- Bonus for first solve
            IF NEW.attempts_count = 1 THEN
                sparks_earned := sparks_earned + 5;
            END IF;

            -- Bonus for high pass rate
            IF NEW.pass_rate = 100 THEN
                sparks_earned := sparks_earned + 5;
                p_score_bonus := 2.50;
            END IF;

            -- Update submission with earned rewards
            UPDATE user_submissions
            SET sparks_earned = sparks_earned,
                p_score_impact = p_score_bonus,
                ecosystem_bonus_points = ecosystem_bonus
            WHERE id = NEW.id;

            -- Add sparks transaction
            INSERT INTO sparks_transactions (user_id, transaction_type, amount, source_type, reference_id, description)
            VALUES (NEW.user_id, 'earned', sparks_earned, 'coding_solved', NEW.id,
                   'Solved: ' || NEW.lesson_title || ' (' || NEW.language || ')');

            -- Update ecosystem profile
            UPDATE user_ecosystem_profile
            SET total_problems_solved = total_problems_solved + 1,
                total_sparks = total_sparks + sparks_earned,
                sparks_this_month = sparks_this_month + sparks_earned,
                sparks_lifetime = sparks_lifetime + sparks_earned,
                p_score = p_score + p_score_bonus,
                last_coding_activity = NOW(),
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        END;
    END IF;

    -- Update session metrics
    IF TG_TABLE_NAME = 'session_bookings' AND NEW.status = 'completed' THEN
        UPDATE user_ecosystem_profile
        SET sessions_completed = sessions_completed + 1,
            sessions_as_student = sessions_as_student + CASE WHEN EXISTS (SELECT 1 WHERE NEW.student_id = NEW.user_id) THEN 1 ELSE 0 END,
            sessions_as_teacher = sessions_as_teacher + CASE WHEN EXISTS (SELECT 1 WHERE NEW.teacher_id = NEW.user_id) THEN 1 ELSE 0 END,
            last_session_activity = NOW(),
            updated_at = NOW()
        WHERE user_id IN (NEW.student_id, NEW.teacher_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for ecosystem integration
DROP TRIGGER IF EXISTS trigger_update_ecosystem_submissions ON user_submissions;
CREATE TRIGGER trigger_update_ecosystem_submissions
    AFTER INSERT ON user_submissions
    FOR EACH ROW EXECUTE FUNCTION update_ecosystem_profile();

DROP TRIGGER IF EXISTS trigger_update_ecosystem_sessions ON session_bookings;
CREATE TRIGGER trigger_update_ecosystem_sessions
    AFTER UPDATE ON session_bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_ecosystem_profile();

-- Function to calculate and update rankings
CREATE OR REPLACE FUNCTION update_ecosystem_rankings()
RETURNS void AS $$
BEGIN
    -- Clear current rankings
    DELETE FROM ecosystem_leaderboards WHERE ranking_period = 'current';

    -- Calculate and insert new rankings
    INSERT INTO ecosystem_leaderboards (
        user_id, coding_rank, trading_rank, teaching_rank, overall_rank,
        coding_score, trading_score, teaching_score, ecosystem_score
    )
    SELECT
        user_id,
        ROW_NUMBER() OVER (ORDER BY total_problems_solved DESC, coding_streak_days DESC) as coding_rank,
        ROW_NUMBER() OVER (ORDER BY p_score DESC, successful_trades DESC) as trading_rank,
        ROW_NUMBER() OVER (ORDER BY teacher_rating DESC, total_students_taught DESC) as teaching_rank,
        ROW_NUMBER() OVER (ORDER BY overall_ecosystem_score DESC) as overall_rank,
        (total_problems_solved * 10 + coding_streak_days * 2) as coding_score,
        (COALESCE(ROUND(p_score), 0) + successful_trades * 5) as trading_score,
        (COALESCE(ROUND(teacher_rating * 100), 0) + total_students_taught * 10) as teaching_score,
        overall_ecosystem_score as ecosystem_score
    FROM user_ecosystem_profile
    WHERE user_id IS NOT NULL;

    RAISE NOTICE 'Rankings updated successfully';
END;
$$ LANGUAGE plpgsql;