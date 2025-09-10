-- Enhanced 3-tier system for user profiles with AscendiaScore calculation
-- Tiers: Pathfinder (0-999), Explorer (1000-4999), Navigator (5000+)

-- Add tier-related columns to existing user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS ascendia_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_tier VARCHAR(20) DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_searchable_teacher BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS teacher_bio TEXT,
ADD COLUMN IF NOT EXISTS teaching_experience TEXT,
ADD COLUMN IF NOT EXISTS max_students_per_session INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS can_host_group_sessions BOOLEAN DEFAULT FALSE;

-- Create tier benefits table
CREATE TABLE IF NOT EXISTS tier_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name VARCHAR(20) NOT NULL UNIQUE,
    tier_min_ascendia_score INTEGER NOT NULL,
    tier_max_ascendia_score INTEGER,
    max_direct_messages_per_day INTEGER DEFAULT 5,
    max_session_requests_per_day INTEGER DEFAULT 2,
    can_be_searched_as_teacher BOOLEAN DEFAULT FALSE,
    can_host_group_sessions BOOLEAN DEFAULT FALSE,
    max_students_per_session INTEGER DEFAULT 1,
    profile_boost_multiplier DECIMAL(3,2) DEFAULT 1.00,
    priority_support BOOLEAN DEFAULT FALSE,
    custom_profile_themes BOOLEAN DEFAULT FALSE,
    advanced_analytics BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert tier benefit levels
INSERT INTO tier_benefits (tier_name, tier_min_ascendia_score, tier_max_ascendia_score, max_direct_messages_per_day, max_session_requests_per_day, can_be_searched_as_teacher, can_host_group_sessions, max_students_per_session, profile_boost_multiplier, priority_support, custom_profile_themes, advanced_analytics) VALUES
('pathfinder', 0, 999, 5, 2, FALSE, FALSE, 1, 1.00, FALSE, FALSE, FALSE),
('explorer', 1000, 4999, 15, 5, TRUE, FALSE, 3, 1.25, FALSE, TRUE, FALSE),
('navigator', 5000, NULL, 50, 20, TRUE, TRUE, 10, 1.50, TRUE, TRUE, TRUE)
ON CONFLICT (tier_name) DO UPDATE SET
    tier_min_ascendia_score = EXCLUDED.tier_min_ascendia_score,
    tier_max_ascendia_score = EXCLUDED.tier_max_ascendia_score,
    max_direct_messages_per_day = EXCLUDED.max_direct_messages_per_day,
    max_session_requests_per_day = EXCLUDED.max_session_requests_per_day,
    can_be_searched_as_teacher = EXCLUDED.can_be_searched_as_teacher,
    can_host_group_sessions = EXCLUDED.can_host_group_sessions,
    max_students_per_session = EXCLUDED.max_students_per_session,
    profile_boost_multiplier = EXCLUDED.profile_boost_multiplier,
    priority_support = EXCLUDED.priority_support,
    custom_profile_themes = EXCLUDED.custom_profile_themes,
    advanced_analytics = EXCLUDED.advanced_analytics;

-- Create AscendiaScore activity weights table for calculating scores
CREATE TABLE IF NOT EXISTS ascendia_score_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type VARCHAR(100) NOT NULL UNIQUE,
    base_points INTEGER NOT NULL,
    max_daily_points INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert AscendiaScore scoring activities
INSERT INTO ascendia_score_activities (activity_type, base_points, max_daily_points, description) VALUES
-- Course and Learning Activities
('course_completion', 100, 500, 'Points for completing a full course'),
('lesson_completion', 10, 100, 'Points for completing individual lessons'),
('assignment_submission', 25, 200, 'Points for submitting assignments'),
('quiz_passed', 15, 150, 'Points for passing quizzes with 70%+ score'),
('perfect_quiz_score', 35, 175, 'Bonus points for 100% quiz scores'),

-- Community Engagement
('forum_post_quality', 20, 100, 'Points for helpful forum posts (upvoted)'),
('question_answered', 30, 300, 'Points for answering others questions'),
('best_answer_selected', 50, 250, 'Bonus when your answer is marked as best'),
('study_group_participation', 15, 75, 'Points for active study group participation'),
('peer_review_completed', 25, 125, 'Points for completing peer reviews'),

-- Mentoring and Teaching
('mentoring_session_completed', 75, 300, 'Points for completing mentoring sessions'),
('positive_mentor_review', 40, 200, 'Points for receiving 4+ star reviews'),
('teaching_session_hosted', 100, 400, 'Points for hosting teaching sessions'),
('student_helped_successfully', 60, 300, 'Points when students report success after help'),

-- Profile and Content Creation
('profile_completion', 50, 50, 'One-time points for completing profile'),
('portfolio_item_added', 30, 150, 'Points for adding portfolio items'),
('achievement_earned', 75, 225, 'Points for earning verified achievements'),
('skill_certification', 100, 300, 'Points for completing skill certifications'),

-- Platform Loyalty and Engagement
('daily_login_streak', 5, 35, 'Points for consecutive daily logins (max 7 days)'),
('weekly_goal_completion', 40, 40, 'Weekly points for meeting learning goals'),
('monthly_challenge_participation', 80, 80, 'Monthly points for challenge participation'),
('referral_successful', 150, 300, 'Points for successful user referrals'),

-- Spark Economy Participation
('sparks_earned', 1, 100, 'Points equal to sparks earned (1:1 ratio)'),
('premium_feature_usage', 10, 50, 'Points for using premium features'),
('marketplace_transaction', 25, 125, 'Points for marketplace activity'),
('subscription_maintained', 200, 200, 'Monthly points for active subscriptions')

ON CONFLICT (activity_type) DO UPDATE SET
    base_points = EXCLUDED.base_points,
    max_daily_points = EXCLUDED.max_daily_points,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Create user daily activity tracking table
CREATE TABLE IF NOT EXISTS user_daily_ascendia_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    activity_type VARCHAR(100) NOT NULL REFERENCES ascendia_score_activities(activity_type),
    points_earned INTEGER NOT NULL,
    points_capped_at INTEGER,
    activity_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, activity_date, activity_type)
);

-- Function to calculate user tier based on ascendia_score
CREATE OR REPLACE FUNCTION calculate_user_tier(user_ascendia_score INTEGER)
RETURNS VARCHAR(20) AS $$
BEGIN
    IF user_ascendia_score >= 5000 THEN
        RETURN 'gold';
    ELSIF user_ascendia_score >= 1000 THEN
        RETURN 'silver';
    ELSE
        RETURN 'bronze';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update user z-index and tier
CREATE OR REPLACE FUNCTION update_user_ascendia_score_and_tier(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    new_ascendia_score INTEGER;
    new_tier VARCHAR(20);
    tier_benefits_row tier_benefits%ROWTYPE;
BEGIN
    -- Calculate total z-index from all user activities
    SELECT COALESCE(SUM(points_earned), 0)
    INTO new_ascendia_score
    FROM user_daily_ascendia_score
    WHERE user_id = target_user_id;
    
    -- Add z-credits to z-index (1:1 ratio)
    SELECT new_ascendia_score + COALESCE(FLOOR(spark_balance), 0)
    INTO new_ascendia_score
    FROM user_wallets
    WHERE user_id = target_user_id;
    
    -- Calculate new tier
    new_tier := calculate_user_tier(new_ascendia_score);
    
    -- Get tier benefits
    SELECT * INTO tier_benefits_row
    FROM tier_benefits
    WHERE tier_name = new_tier;
    
    -- Update user profile with new z-index, tier, and tier-based permissions
    UPDATE user_profiles SET
        ascendia_score = new_ascendia_score,
        user_tier = new_tier,
        tier_updated_at = CURRENT_TIMESTAMP,
        is_searchable_teacher = tier_benefits_row.can_be_searched_as_teacher,
        can_host_group_sessions = tier_benefits_row.can_host_group_sessions,
        max_students_per_session = tier_benefits_row.max_students_per_session,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = target_user_id;
    
    -- Create profile if it doesn't exist
    INSERT INTO user_profiles (user_id, ascendia_score, user_tier, is_searchable_teacher, can_host_group_sessions, max_students_per_session)
    VALUES (target_user_id, new_ascendia_score, new_tier, tier_benefits_row.can_be_searched_as_teacher, tier_benefits_row.can_host_group_sessions, tier_benefits_row.max_students_per_session)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to add z-index points for user activities
CREATE OR REPLACE FUNCTION add_ascendia_score_points(
    target_user_id UUID,
    activity VARCHAR(100),
    activity_count INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
    activity_config ascendia_score_activities%ROWTYPE;
    current_daily_points INTEGER;
    points_to_add INTEGER;
    final_points INTEGER;
BEGIN
    -- Get activity configuration
    SELECT * INTO activity_config
    FROM ascendia_score_activities
    WHERE activity_type = activity AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Activity type % not found or inactive', activity;
    END IF;
    
    -- Check current daily points for this activity
    SELECT COALESCE(SUM(points_earned), 0)
    INTO current_daily_points
    FROM user_daily_ascendia_score
    WHERE user_id = target_user_id
    AND activity_date = CURRENT_DATE
    AND activity_type = activity;
    
    -- Calculate points to add (respecting daily limits)
    points_to_add := activity_config.base_points * activity_count;
    
    -- Apply daily cap if exists
    IF activity_config.max_daily_points IS NOT NULL THEN
        points_to_add := LEAST(points_to_add, activity_config.max_daily_points - current_daily_points);
        points_to_add := GREATEST(points_to_add, 0); -- Don't allow negative points
    END IF;
    
    -- Insert or update daily activity record
    INSERT INTO user_daily_ascendia_score (user_id, activity_type, points_earned, points_capped_at, activity_count)
    VALUES (target_user_id, activity, points_to_add, activity_config.max_daily_points, activity_count)
    ON CONFLICT (user_id, activity_date, activity_type)
    DO UPDATE SET
        points_earned = user_daily_ascendia_score.points_earned + points_to_add,
        activity_count = user_daily_ascendia_score.activity_count + activity_count,
        points_capped_at = activity_config.max_daily_points;
    
    -- Update user's overall z-index and tier
    PERFORM update_user_ascendia_score_and_tier(target_user_id);
    
    RETURN points_to_add;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON user_profiles(user_tier, ascendia_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_searchable ON user_profiles(is_searchable_teacher, user_tier, ascendia_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_ascendia_score ON user_profiles(ascendia_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_daily_ascendia_score_user_date ON user_daily_ascendia_score(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_user_daily_ascendia_score_activity ON user_daily_ascendia_score(activity_type, activity_date);

-- Initialize z-index and tiers for existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM users LOOP
        PERFORM update_user_ascendia_score_and_tier(user_record.id);
    END LOOP;
END $$;