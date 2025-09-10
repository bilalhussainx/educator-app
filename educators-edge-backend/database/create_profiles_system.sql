-- Create comprehensive user profile system for mentoring, counseling, and services

-- User profiles table (extended profile information)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    display_name VARCHAR(100),
    bio TEXT,
    location VARCHAR(100),
    timezone VARCHAR(50),
    profile_image_url VARCHAR(500),
    is_mentor BOOLEAN DEFAULT FALSE,
    is_counselor BOOLEAN DEFAULT FALSE,
    is_essay_editor BOOLEAN DEFAULT FALSE,
    hourly_rate_z_credits DECIMAL(10, 2) DEFAULT 0.00,
    hourly_rate_usd DECIMAL(10, 2) DEFAULT 0.00,
    years_experience INTEGER DEFAULT 0,
    education_level VARCHAR(50), -- 'high_school', 'bachelor', 'master', 'phd', 'professional'
    languages TEXT[], -- Array of languages spoken
    availability_status VARCHAR(20) DEFAULT 'available', -- 'available', 'busy', 'offline'
    total_sessions INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    verified_mentor BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Specializations/expertise areas
CREATE TABLE IF NOT EXISTS specializations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL, -- 'computer_science', 'finance', 'college_prep', 'essay_writing'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User specializations (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_specializations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialization_id UUID NOT NULL REFERENCES specializations(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced', 'expert'
    years_experience INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, specialization_id)
);

-- Reviews and ratings
CREATE TABLE IF NOT EXISTS user_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES session_requests(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    service_type VARCHAR(50), -- 'mentoring', 'counseling', 'essay_editing'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reviewer_id, reviewed_user_id, session_id)
);

-- Essay editing requests
CREATE TABLE IF NOT EXISTS essay_editing_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    editor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    essay_type VARCHAR(50) NOT NULL, -- 'college_admission', 'scholarship', 'personal_statement', 'academic_paper'
    word_count INTEGER,
    deadline TIMESTAMP,
    original_content TEXT NOT NULL,
    edited_content TEXT,
    editor_notes TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    z_credits_cost DECIMAL(10, 2) DEFAULT 0.00,
    usd_cost DECIMAL(10, 2) DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'refunded'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Portfolio items (for showcasing work)
CREATE TABLE IF NOT EXISTS portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    item_type VARCHAR(50), -- 'project', 'certificate', 'publication', 'essay_sample'
    url VARCHAR(500),
    file_path VARCHAR(500),
    tags TEXT[], -- Array of tags
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements and certifications
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    achievement_type VARCHAR(50), -- 'certification', 'award', 'completion', 'milestone'
    issuer VARCHAR(200),
    issued_date DATE,
    expiry_date DATE,
    verification_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_mentor ON user_profiles(is_mentor, availability_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_counselor ON user_profiles(is_counselor, availability_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_essay_editor ON user_profiles(is_essay_editor, availability_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_rating ON user_profiles(average_rating DESC, total_reviews DESC);
CREATE INDEX IF NOT EXISTS idx_user_specializations_user ON user_specializations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_specializations_spec ON user_specializations(specialization_id);
CREATE INDEX IF NOT EXISTS idx_specializations_category ON specializations(category);
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewed ON user_reviews(reviewed_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_essay_requests_status ON essay_editing_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_essay_requests_editor ON essay_editing_requests(editor_id, status);

-- Insert default specializations
INSERT INTO specializations (name, category, description) VALUES
-- Computer Science
('Web Development', 'computer_science', 'Frontend and backend web development, HTML, CSS, JavaScript, React, Node.js'),
('Data Science', 'computer_science', 'Machine learning, statistics, Python, R, data analysis and visualization'),
('Software Engineering', 'computer_science', 'Software design, algorithms, system architecture, best practices'),
('Mobile Development', 'computer_science', 'iOS and Android app development, React Native, Flutter'),
('Database Design', 'computer_science', 'SQL, NoSQL, database optimization and management'),
('DevOps', 'computer_science', 'CI/CD, cloud platforms, containerization, infrastructure management'),
('Cybersecurity', 'computer_science', 'Network security, ethical hacking, security audits and protocols'),

-- Finance
('Personal Finance', 'finance', 'Budgeting, saving, debt management, financial planning'),
('Investment Strategies', 'finance', 'Stocks, bonds, portfolio management, risk assessment'),
('Cryptocurrency', 'finance', 'Blockchain technology, digital currencies, DeFi, trading'),
('Financial Modeling', 'finance', 'Excel modeling, valuation, financial analysis and forecasting'),
('Corporate Finance', 'finance', 'Capital structure, mergers, acquisitions, financial strategy'),
('Accounting', 'finance', 'Financial statements, bookkeeping, tax preparation, auditing'),

-- College Preparation
('College Applications', 'college_prep', 'Application strategy, school selection, timeline management'),
('Standardized Tests', 'college_prep', 'SAT, ACT, GRE, GMAT preparation and strategy'),
('Scholarship Search', 'college_prep', 'Finding and applying for scholarships and financial aid'),
('Career Planning', 'college_prep', 'Major selection, career exploration, internship guidance'),
('Study Skills', 'college_prep', 'Time management, note-taking, exam preparation techniques'),

-- Essay Writing
('College Essays', 'essay_writing', 'Personal statements, college admission essays, supplemental essays'),
('Academic Writing', 'essay_writing', 'Research papers, thesis writing, academic formatting'),
('Creative Writing', 'essay_writing', 'Fiction, poetry, creative non-fiction, storytelling'),
('Business Writing', 'essay_writing', 'Professional communication, reports, proposals, presentations'),
('Scholarship Essays', 'essay_writing', 'Scholarship applications, award essays, grant writing')

ON CONFLICT (name) DO NOTHING;