-- =================================================================
-- ASCENDIA PLATFORM: Currency of Connection Database Schema
-- =================================================================
-- This creates the core tables for the mentorship marketplace,
-- social network features, and Ascendia Launchpad

BEGIN;

-- =================================================================
-- TRUST GRAPH & SOCIAL NETWORK TABLES
-- =================================================================

-- Connections table for the Trust Graph social network
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    connection_type VARCHAR(30) DEFAULT 'professional' CHECK (connection_type IN ('professional', 'mentorship', 'collaboration', 'academic')),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, recipient_id),
    CHECK (requester_id != recipient_id)
);

-- Followers table for asymmetric following relationships
CREATE TABLE IF NOT EXISTS followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notification_preferences JSONB DEFAULT '{"new_posts": true, "achievements": true, "sessions": false}',
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- =================================================================
-- MENTORSHIP MARKETPLACE TABLES
-- =================================================================

-- Enhanced mentor profiles for marketplace functionality
CREATE TABLE IF NOT EXISTS mentor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    specialties TEXT[] NOT NULL DEFAULT '{}',
    session_rate_usd DECIMAL(10,2) DEFAULT 0.00,
    session_rate_sparks INTEGER DEFAULT 0,
    stripe_connect_id VARCHAR(255), -- Stripe Connect account ID
    stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
    bio_extended TEXT,
    availability_schedule JSONB, -- Weekly availability slots
    session_duration_minutes INTEGER[] DEFAULT '{30, 60, 90}', -- Available session lengths
    max_sessions_per_day INTEGER DEFAULT 5,
    advance_booking_days INTEGER DEFAULT 30, -- How far in advance sessions can be booked
    cancellation_policy TEXT DEFAULT '24 hours notice required for full refund',
    instant_booking_enabled BOOLEAN DEFAULT FALSE,
    verified_mentor BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP,
    total_earnings_usd DECIMAL(12,2) DEFAULT 0.00,
    total_earnings_sparks BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for tracking booked appointments and payments
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) DEFAULT 'mentoring' CHECK (session_type IN ('mentoring', 'counseling', 'essay_editing', 'skill_coaching', 'career_guidance')),
    
    -- Scheduling
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Meeting details
    meeting_url VARCHAR(500), -- Video call link
    meeting_password VARCHAR(100),
    session_notes TEXT, -- Pre-session notes from mentee
    mentor_prep_notes TEXT, -- Mentor's preparation notes
    
    -- Status and workflow
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMP,
    
    -- Payment and escrow
    payment_status VARCHAR(30) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'escrowed', 'released', 'refunded', 'disputed')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('sparks', 'usd', 'free')),
    amount_sparks INTEGER DEFAULT 0,
    amount_usd DECIMAL(10,2) DEFAULT 0.00,
    stripe_payment_intent_id VARCHAR(255), -- Stripe Payment Intent ID
    escrow_released_at TIMESTAMP,
    
    -- Session outcome
    completion_confirmed_by_mentor BOOLEAN DEFAULT FALSE,
    completion_confirmed_by_mentee BOOLEAN DEFAULT FALSE,
    mentor_summary TEXT, -- Post-session summary from mentor
    mentee_feedback TEXT, -- Post-session feedback from mentee
    follow_up_recommended BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (mentor_id != mentee_id),
    CHECK (scheduled_at > CURRENT_TIMESTAMP OR status IN ('completed', 'cancelled', 'no_show'))
);

-- Reviews table for session feedback and ratings
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rating and feedback
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_title VARCHAR(200),
    review_text TEXT,
    
    -- Review categories
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    expertise_rating INTEGER CHECK (expertise_rating >= 1 AND expertise_rating <= 5),
    helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
    
    -- Review metadata
    is_public BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE, -- Verified purchase review
    mentor_response TEXT, -- Mentor can respond to reviews
    mentor_responded_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(session_id, reviewer_id), -- One review per session per reviewer
    CHECK (reviewer_id != reviewed_user_id)
);

-- Enhanced user_wallets for Spark economy
CREATE TABLE IF NOT EXISTS user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    spark_balance INTEGER DEFAULT 0 CHECK (spark_balance >= 0),
    total_earned_sparks BIGINT DEFAULT 0,
    total_spent_sparks BIGINT DEFAULT 0,
    total_earned_usd DECIMAL(12,2) DEFAULT 0.00,
    total_spent_usd DECIMAL(12,2) DEFAULT 0.00,
    escrow_balance_sparks INTEGER DEFAULT 0, -- Sparks in escrow for pending sessions
    escrow_balance_usd DECIMAL(10,2) DEFAULT 0.00, -- USD in escrow for pending sessions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table for all Spark and Fiat transfers
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'refund', 'bonus', 'transfer', 'withdrawal', 'deposit')),
    
    -- Amount and currency
    amount_sparks INTEGER DEFAULT 0,
    amount_usd DECIMAL(10,2) DEFAULT 0.00,
    currency_type VARCHAR(10) DEFAULT 'sparks' CHECK (currency_type IN ('sparks', 'usd', 'mixed')),
    
    -- Transaction details
    description TEXT NOT NULL,
    reference_id UUID, -- Can reference sessions, courses, etc.
    reference_type VARCHAR(50), -- 'session', 'course', 'bonus', etc.
    
    -- Payment processing
    stripe_charge_id VARCHAR(255), -- Stripe charge/payment intent ID
    stripe_transfer_id VARCHAR(255), -- Stripe transfer ID for payouts
    payment_method VARCHAR(50), -- 'card', 'bank', 'sparks', etc.
    
    -- Status and metadata
    status VARCHAR(30) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'disputed')),
    failure_reason TEXT,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Balances after transaction (for auditing)
    balance_after_sparks INTEGER,
    balance_after_usd DECIMAL(10,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================
-- ASCENDIA LAUNCHPAD TABLES
-- =================================================================

-- Applications table for the Ascendia Launchpad program
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Application metadata
    application_type VARCHAR(50) DEFAULT 'mentorship' CHECK (application_type IN ('mentorship', 'leadership', 'entrepreneurship', 'academic', 'creative')),
    program_cycle VARCHAR(20) NOT NULL, -- e.g., 'Spring 2024', 'Fall 2024'
    
    -- Application status
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'interview_scheduled', 'accepted', 'rejected', 'waitlisted')),
    submitted_at TIMESTAMP,
    decision_date TIMESTAMP,
    decision_reason TEXT,
    
    -- Application data
    title VARCHAR(200) NOT NULL,
    summary TEXT NOT NULL,
    goals TEXT NOT NULL,
    background TEXT NOT NULL,
    
    -- Requirements checklist
    has_mentor_recommendations BOOLEAN DEFAULT FALSE,
    has_portfolio_items BOOLEAN DEFAULT FALSE,
    has_academic_transcripts BOOLEAN DEFAULT FALSE,
    requirements_complete BOOLEAN DEFAULT FALSE,
    
    -- Scoring and evaluation
    total_score DECIMAL(5,2) DEFAULT 0.00,
    academic_score DECIMAL(5,2) DEFAULT 0.00,
    potential_score DECIMAL(5,2) DEFAULT 0.00,
    commitment_score DECIMAL(5,2) DEFAULT 0.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Application sections for structured application content
CREATE TABLE IF NOT EXISTS application_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL CHECK (section_type IN ('essay', 'goals', 'experience', 'portfolio', 'recommendation', 'transcript')),
    section_title VARCHAR(200) NOT NULL,
    section_content TEXT NOT NULL,
    word_count INTEGER,
    file_attachments JSONB DEFAULT '[]', -- Array of file metadata
    section_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Application reviews for evaluation process
CREATE TABLE IF NOT EXISTS application_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Review scores (1-10 scale)
    academic_score DECIMAL(3,1) CHECK (academic_score >= 0 AND academic_score <= 10),
    potential_score DECIMAL(3,1) CHECK (potential_score >= 0 AND potential_score <= 10),
    commitment_score DECIMAL(3,1) CHECK (commitment_score >= 0 AND commitment_score <= 10),
    overall_score DECIMAL(3,1) CHECK (overall_score >= 0 AND overall_score <= 10),
    
    -- Review content
    strengths TEXT,
    weaknesses TEXT,
    recommendation VARCHAR(20) CHECK (recommendation IN ('strong_accept', 'accept', 'waitlist', 'reject', 'strong_reject')),
    private_notes TEXT, -- Internal reviewer notes
    
    -- Review status
    review_status VARCHAR(20) DEFAULT 'draft' CHECK (review_status IN ('draft', 'submitted', 'calibrated')),
    submitted_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(application_id, reviewer_id) -- One review per reviewer per application
);

-- =================================================================
-- PERFORMANCE INDEXES
-- =================================================================

-- Trust Graph indexes
CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_recipient ON connections(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);

-- Mentorship Marketplace indexes
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_specialties ON mentor_profiles USING GIN(specialties);
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_rates ON mentor_profiles(session_rate_usd, session_rate_sparks);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor ON sessions(mentor_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sessions_mentee ON sessions(mentee_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reviews_session ON reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user ON reviews(reviewed_user_id, is_public, created_at DESC);

-- Wallet and transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe ON transactions(stripe_charge_id) WHERE stripe_charge_id IS NOT NULL;

-- Launchpad indexes
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_cycle ON applications(program_cycle, status);
CREATE INDEX IF NOT EXISTS idx_application_sections_app ON application_sections(application_id, section_order);
CREATE INDEX IF NOT EXISTS idx_application_reviews_app ON application_reviews(application_id, review_status);

-- =================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =================================================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mentor_profiles_updated_at BEFORE UPDATE ON mentor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON user_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_application_sections_updated_at BEFORE UPDATE ON application_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_application_reviews_updated_at BEFORE UPDATE ON application_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- =================================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- =================================================================

-- Uncomment to insert sample specialties for mentor profiles
/*
INSERT INTO mentor_profiles (user_id, specialties, session_rate_usd, session_rate_sparks) 
SELECT 
    u.id,
    ARRAY['Web Development', 'Career Guidance'],
    75.00,
    150
FROM users u 
JOIN user_profiles up ON u.id = up.user_id 
WHERE up.is_mentor = TRUE 
LIMIT 5
ON CONFLICT (user_id) DO NOTHING;
*/