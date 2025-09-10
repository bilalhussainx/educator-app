-- =================================================================
-- ASCENDIA PLATFORM MIGRATION: Four Pillars of Ascent Scoring Model
-- =================================================================
-- This migration transforms the complex daily-capped activity system 
-- into the strategic Four Pillars scoring model

BEGIN;

-- Step 1: Drop the old complex activity system tables
-- These are being replaced with the simpler Four Pillars model
DROP TABLE IF EXISTS user_daily_ascendia_score CASCADE;
DROP TABLE IF EXISTS ascendia_score_activities CASCADE;

-- Legacy naming support (if these exist from previous implementation)
DROP TABLE IF EXISTS user_daily_z_index CASCADE;
DROP TABLE IF EXISTS z_index_activities CASCADE;

-- Step 2: Modify user_profiles table to implement Four Pillars
-- Rename the main score column to align with Ascendia branding
ALTER TABLE user_profiles 
RENAME COLUMN z_index TO ascendia_score_total;

-- Add the Four Pillars of Ascent scoring columns
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS score_academic INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_community INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_mentorship INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_analytical INTEGER DEFAULT 0;

-- Step 3: Update tier system to use Ascendia terminology
-- Update tier names in the benefits table
UPDATE tier_benefits SET tier_name = 'pathfinder' WHERE tier_name = 'bronze';
UPDATE tier_benefits SET tier_name = 'explorer' WHERE tier_name = 'silver';  
UPDATE tier_benefits SET tier_name = 'navigator' WHERE tier_name = 'gold';

-- Update existing user profiles with new tier names
UPDATE user_profiles SET user_tier = 'pathfinder' WHERE user_tier = 'bronze';
UPDATE user_profiles SET user_tier = 'explorer' WHERE user_tier = 'silver';
UPDATE user_profiles SET user_tier = 'navigator' WHERE user_tier = 'gold';

-- Step 4: Update tier calculation function for Ascendia scoring
CREATE OR REPLACE FUNCTION calculate_user_tier(user_ascendia_score INTEGER)
RETURNS VARCHAR(20) AS $$
BEGIN
    IF user_ascendia_score >= 5000 THEN
        RETURN 'navigator';
    ELSIF user_ascendia_score >= 1000 THEN
        RETURN 'explorer';
    ELSE
        RETURN 'pathfinder';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create the core Four Pillars scoring function
CREATE OR REPLACE FUNCTION recalculate_total_ascendia_score(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_total_score INTEGER;
    new_tier VARCHAR(20);
    tier_benefits_row tier_benefits%ROWTYPE;
BEGIN
    -- Calculate total AscendiaScore from the Four Pillars
    SELECT 
        COALESCE(score_academic, 0) + 
        COALESCE(score_community, 0) + 
        COALESCE(score_mentorship, 0) + 
        COALESCE(score_analytical, 0)
    INTO new_total_score
    FROM user_profiles
    WHERE user_id = target_user_id;
    
    -- Add Spark balance to AscendiaScore (1:1 ratio)
    SELECT new_total_score + COALESCE(FLOOR(spark_balance), 0)
    INTO new_total_score
    FROM user_wallets
    WHERE user_id = target_user_id;
    
    -- Calculate new tier
    new_tier := calculate_user_tier(new_total_score);
    
    -- Get tier benefits
    SELECT * INTO tier_benefits_row
    FROM tier_benefits
    WHERE tier_name = new_tier;
    
    -- Update user profile with new total score, tier, and permissions
    UPDATE user_profiles SET
        ascendia_score_total = new_total_score,
        user_tier = new_tier,
        tier_updated_at = CURRENT_TIMESTAMP,
        is_searchable_teacher = tier_benefits_row.can_be_searched_as_teacher,
        can_host_group_sessions = tier_benefits_row.can_host_group_sessions,
        max_students_per_session = tier_benefits_row.max_students_per_session,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = target_user_id;
    
    RETURN new_total_score;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create the Four Pillars scoring function
CREATE OR REPLACE FUNCTION add_ascendia_pillar_points(
    target_user_id UUID,
    pillar_name VARCHAR(20),
    points_to_add INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    column_name VARCHAR(30);
    new_pillar_score INTEGER;
BEGIN
    -- Validate pillar name and construct column name
    CASE pillar_name
        WHEN 'academic' THEN column_name := 'score_academic';
        WHEN 'community' THEN column_name := 'score_community';
        WHEN 'mentorship' THEN column_name := 'score_mentorship';
        WHEN 'analytical' THEN column_name := 'score_analytical';
        ELSE RAISE EXCEPTION 'Invalid pillar name: %. Must be academic, community, mentorship, or analytical', pillar_name;
    END CASE;
    
    -- Update the specific pillar score using dynamic SQL
    EXECUTE format('
        UPDATE user_profiles 
        SET %I = COALESCE(%I, 0) + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
        RETURNING %I', column_name, column_name, column_name)
    USING points_to_add, target_user_id
    INTO new_pillar_score;
    
    -- Recalculate total AscendiaScore and update tier
    PERFORM recalculate_total_ascendia_score(target_user_id);
    
    RETURN new_pillar_score;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to automatically recalculate total score
CREATE OR REPLACE FUNCTION trigger_recalculate_ascendia_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Only recalculate if one of the pillar scores changed
    IF (OLD.score_academic IS DISTINCT FROM NEW.score_academic OR
        OLD.score_community IS DISTINCT FROM NEW.score_community OR
        OLD.score_mentorship IS DISTINCT FROM NEW.score_mentorship OR
        OLD.score_analytical IS DISTINCT FROM NEW.score_analytical) THEN
        
        PERFORM recalculate_total_ascendia_score(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS ascendia_score_recalc_trigger ON user_profiles;
CREATE TRIGGER ascendia_score_recalc_trigger
    AFTER UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_ascendia_score();

-- Step 8: Update performance indexes for Ascendia system
DROP INDEX IF EXISTS idx_user_profiles_z_index;
DROP INDEX IF EXISTS idx_user_profiles_tier;
DROP INDEX IF EXISTS idx_user_profiles_searchable;

-- Create new indexes for AscendiaScore system
CREATE INDEX IF NOT EXISTS idx_user_profiles_ascendia_score ON user_profiles(ascendia_score_total DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier_ascendia ON user_profiles(user_tier, ascendia_score_total DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_searchable_ascendia ON user_profiles(is_searchable_teacher, user_tier, ascendia_score_total DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_pillars ON user_profiles(score_academic, score_community, score_mentorship, score_analytical);

-- Step 9: Migrate existing Z-Credits to Sparks in user_wallets
-- Update column names for Ascendia branding
ALTER TABLE user_wallets 
RENAME COLUMN z_credit_balance TO spark_balance;

-- Update transaction history table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'z_credit_transactions') THEN
        ALTER TABLE z_credit_transactions RENAME TO spark_transactions;
    END IF;
END $$;

-- Step 10: Initialize existing users with default pillar scores
-- This ensures all existing users have proper Four Pillars data
UPDATE user_profiles 
SET 
    score_academic = COALESCE(score_academic, FLOOR(ascendia_score_total * 0.25)),
    score_community = COALESCE(score_community, FLOOR(ascendia_score_total * 0.25)),
    score_mentorship = COALESCE(score_mentorship, FLOOR(ascendia_score_total * 0.25)),
    score_analytical = COALESCE(score_analytical, FLOOR(ascendia_score_total * 0.25))
WHERE score_academic IS NULL OR score_community IS NULL OR score_mentorship IS NULL OR score_analytical IS NULL;

-- Step 11: Recalculate all user scores with new system
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT user_id FROM user_profiles LOOP
        PERFORM recalculate_total_ascendia_score(user_record.user_id);
    END LOOP;
END $$;

COMMIT;

-- =================================================================
-- MIGRATION VERIFICATION QUERIES
-- =================================================================
-- Run these to verify the migration was successful:

-- Check tier distribution
-- SELECT user_tier, COUNT(*) as user_count FROM user_profiles GROUP BY user_tier;

-- Check Four Pillars data
-- SELECT 
--     user_tier,
--     AVG(score_academic) as avg_academic,
--     AVG(score_community) as avg_community, 
--     AVG(score_mentorship) as avg_mentorship,
--     AVG(score_analytical) as avg_analytical,
--     AVG(ascendia_score_total) as avg_total
-- FROM user_profiles 
-- GROUP BY user_tier;

-- Check searchable teachers by tier
-- SELECT user_tier, COUNT(*) as searchable_teachers 
-- FROM user_profiles 
-- WHERE is_searchable_teacher = TRUE 
-- GROUP BY user_tier;