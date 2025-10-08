-- AI Comment System with Memory and Learning
-- This schema stores comment history, user feedback, and learning patterns

-- Table to store all AI-generated comments
CREATE TABLE IF NOT EXISTS ai_comments (
    id SERIAL PRIMARY KEY,
    session_id BIGINT NULL, -- References dual_mode_sessions(id) - no FK due to varying types
    user_id BIGINT NOT NULL, -- References users(id) - no FK due to varying types
    document_type VARCHAR(50) NOT NULL, -- 'essay', 'resume', 'paper', etc.
    document_content TEXT NOT NULL,
    document_hash VARCHAR(64) NOT NULL, -- SHA256 hash to detect document changes

    -- Comment details
    comment_type VARCHAR(50) NOT NULL, -- 'word_choice', 'sentence_structure', 'theme', etc.
    severity VARCHAR(20) NOT NULL, -- 'positive', 'minor', 'moderate', 'major'
    category VARCHAR(100) NOT NULL,

    -- Comment content
    highlighted_text TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    message TEXT NOT NULL,
    suggestion TEXT,
    explanation TEXT,
    replacement_text TEXT,
    alternatives JSONB, -- Array of alternative suggestions

    -- Metadata
    confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.80,
    prompt_template VARCHAR(100), -- Which coaching prompt was used
    custom_prompt TEXT, -- If user provided custom prompt

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for ai_comments
CREATE INDEX IF NOT EXISTS idx_ai_comments_session ON ai_comments(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_comments_user ON ai_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_comments_hash ON ai_comments(document_hash);
CREATE INDEX IF NOT EXISTS idx_ai_comments_type ON ai_comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_ai_comments_created ON ai_comments(created_at);

-- Note: No FK constraints because users.id and dual_mode_sessions.id types vary (UUID/BIGINT/VARCHAR)
-- Application layer handles referential integrity

-- Table to track user actions on comments (for learning)
CREATE TABLE IF NOT EXISTS ai_comment_feedback (
    id SERIAL PRIMARY KEY,
    comment_id BIGINT NOT NULL, -- References ai_comments(id)
    user_id BIGINT NOT NULL, -- References users(id) - no FK due to varying types

    -- User action
    action VARCHAR(20) NOT NULL, -- 'applied', 'dismissed', 'liked', 'disliked', 'modified'

    -- If user modified the suggestion, store what they actually used
    user_modification TEXT,

    -- Timing information
    time_to_action INTEGER, -- Milliseconds until user took action

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for ai_comment_feedback
CREATE INDEX IF NOT EXISTS idx_feedback_comment ON ai_comment_feedback(comment_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON ai_comment_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_action ON ai_comment_feedback(action);

-- Table to store learned patterns from user behavior
CREATE TABLE IF NOT EXISTS ai_learning_patterns (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL, -- References users(id) - no FK due to varying types

    -- Pattern identification
    pattern_type VARCHAR(50) NOT NULL, -- 'preferred_style', 'rejected_category', 'modification_pattern'
    pattern_key VARCHAR(100) NOT NULL, -- e.g., 'word_choice_very_to_extremely'

    -- Pattern details
    pattern_data JSONB NOT NULL, -- Flexible storage for pattern details

    -- Statistics
    occurrences INTEGER DEFAULT 1,
    success_rate DECIMAL(3, 2) DEFAULT 0.00, -- How often this pattern led to positive outcomes
    confidence_score DECIMAL(3, 2) DEFAULT 0.50,

    -- Metadata
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, pattern_key)
);

-- Create indexes for ai_learning_patterns
CREATE INDEX IF NOT EXISTS idx_learning_user ON ai_learning_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_type ON ai_learning_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learning_score ON ai_learning_patterns(confidence_score);

-- Table for coaching prompt templates
CREATE TABLE IF NOT EXISTS ai_coaching_prompts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'essay_coach', 'resume_expert', 'academic_writing', etc.

    -- Prompt configuration
    focus_areas JSONB NOT NULL, -- Array of focus areas
    comment_types JSONB NOT NULL, -- Preferred comment types to generate
    density_target INTEGER DEFAULT 50, -- Target number of comments

    -- Prompt template
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL, -- Template with variables like {documentType}, {content}

    -- Metadata
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,

    created_by BIGINT NULL, -- References users(id) - no FK due to varying types
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for ai_coaching_prompts
CREATE INDEX IF NOT EXISTS idx_prompts_category ON ai_coaching_prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_active ON ai_coaching_prompts(is_active);

-- Table to track comment generation sessions
CREATE TABLE IF NOT EXISTS ai_comment_sessions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL, -- References users(id) - no FK due to varying types
    session_id BIGINT NULL, -- References dual_mode_sessions(id) - no FK due to varying types

    -- Generation details
    document_type VARCHAR(50) NOT NULL,
    document_length INTEGER NOT NULL,
    prompt_template_id BIGINT NULL, -- References ai_coaching_prompts(id)
    custom_prompt TEXT,

    -- Results
    comments_generated INTEGER DEFAULT 0,
    generation_time_ms INTEGER,
    api_used VARCHAR(20), -- 'claude', 'gemini', 'fallback'

    -- User engagement
    comments_viewed INTEGER DEFAULT 0,
    comments_applied INTEGER DEFAULT 0,
    comments_dismissed INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for ai_comment_sessions
CREATE INDEX IF NOT EXISTS idx_comment_sessions_user ON ai_comment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_sessions_session ON ai_comment_sessions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comment_sessions_created ON ai_comment_sessions(created_at);

-- Insert default coaching prompt templates
INSERT INTO ai_coaching_prompts (name, description, category, focus_areas, comment_types, density_target, system_prompt, user_prompt_template, is_default) VALUES
(
    'Essay Coach - Comprehensive',
    'Comprehensive essay coaching focusing on structure, flow, and argumentation',
    'essay_coach',
    '["structure", "argumentation", "clarity", "engagement", "style"]'::jsonb,
    '["thematic_insight", "rhetorical_strategy", "stylistic_craft", "structural_coherence", "reader_engagement"]'::jsonb,
    50,
    'You are an expert essay coach who provides detailed, actionable feedback. Focus on helping students develop their voice, strengthen their arguments, and create engaging narratives. Provide specific suggestions with concrete examples.',
    'Analyze this {documentType} and provide at least {targetComments} detailed comments covering:\n\n1. THEMATIC DEVELOPMENT (25%): How well does the essay develop its central themes?\n2. RHETORICAL STRATEGY (25%): Are the arguments logical and persuasive?\n3. PROSE CRAFT (20%): Is the writing clear, vivid, and engaging?\n4. STRUCTURAL COHERENCE (15%): Does the essay flow logically?\n5. READER ENGAGEMENT (15%): Does it capture and maintain attention?\n\nDocument:\n{content}\n\nIMPORTANT: Generate comments distributed throughout the ENTIRE document, not just the beginning. Provide specific text replacements and concrete suggestions.',
    true
),
(
    'College Application Essay Coach',
    'Specialized coaching for college application essays - focuses on authenticity, voice, and impact',
    'essay_coach',
    '["authenticity", "personal_voice", "impact", "storytelling", "reflection"]'::jsonb,
    '["thematic_insight", "reader_engagement", "stylistic_craft", "contextual_connection"]'::jsonb,
    40,
    'You are a college admissions essay expert. Help students craft authentic, compelling personal narratives that showcase their unique perspective and growth. Focus on showing vs. telling, specific details, and genuine reflection.',
    'Review this college application essay and provide detailed feedback on:\n\n1. AUTHENTICITY & VOICE (30%): Does it sound genuine and personal?\n2. STORYTELLING (25%): Are there vivid details and engaging narrative?\n3. REFLECTION & GROWTH (20%): Does it show insight and personal development?\n4. IMPACT (15%): Will it stand out to admissions officers?\n5. TECHNICAL CRAFT (10%): Is the writing polished and professional?\n\nProvide at least {targetComments} specific comments with concrete suggestions.\n\nEssay:\n{content}',
    true
),
(
    'Resume Optimization Expert',
    'Resume-focused coaching emphasizing quantification, impact, and ATS optimization',
    'resume_expert',
    '["quantification", "action_verbs", "keywords", "clarity", "impact"]'::jsonb,
    '["quantification", "action_verbs", "keywords", "clarity"]'::jsonb,
    30,
    'You are a resume optimization expert with deep knowledge of ATS systems and hiring best practices. Help users create compelling bullet points with strong action verbs, quantifiable achievements, and relevant keywords.',
    'Analyze this resume and provide detailed optimization suggestions:\n\n1. QUANTIFICATION (30%): Add specific metrics and numbers\n2. ACTION VERBS (25%): Use strong, impactful verbs\n3. KEYWORDS (20%): Include relevant industry keywords\n4. CLARITY (15%): Make achievements clear and concise\n5. IMPACT (10%): Highlight the value delivered\n\nProvide at least {targetComments} bullet-by-bullet comments.\n\nResume:\n{content}',
    true
),
(
    'Academic Writing Coach',
    'Scholarly writing coach focusing on rigor, citation, and academic conventions',
    'academic_writing',
    '["argumentation", "evidence", "citation", "formal_style", "clarity"]'::jsonb,
    '["intellectual_depth", "rhetorical_strategy", "structural_coherence"]'::jsonb,
    50,
    'You are an academic writing expert who helps students produce rigorous, well-researched papers. Focus on argumentation, evidence integration, proper citation, and formal academic style.',
    'Review this academic paper for:\n\n1. ARGUMENTATION (25%): Is the thesis clear and well-supported?\n2. EVIDENCE USE (25%): Are sources integrated effectively?\n3. CRITICAL ANALYSIS (20%): Does it demonstrate deep thinking?\n4. STRUCTURE (15%): Is the organization logical?\n5. ACADEMIC STYLE (15%): Does it follow conventions?\n\nProvide at least {targetComments} detailed comments.\n\nPaper:\n{content}',
    true
),
(
    'Creative Writing Coach',
    'Creative writing coach focusing on vivid imagery, character development, and narrative flow',
    'creative_writing',
    '["imagery", "character", "dialogue", "pacing", "voice"]'::jsonb,
    '["stylistic_craft", "reader_engagement", "thematic_insight"]'::jsonb,
    60,
    'You are a creative writing mentor who helps writers craft vivid stories with compelling characters and engaging narratives. Focus on show-don''t-tell, sensory details, dialogue, and emotional resonance.',
    'Analyze this creative piece for:\n\n1. IMAGERY & DESCRIPTION (25%): Are sensory details vivid?\n2. CHARACTER DEVELOPMENT (20%): Are characters compelling?\n3. DIALOGUE (15%): Does it sound natural and revealing?\n4. PACING & FLOW (20%): Does the story move well?\n5. VOICE & STYLE (20%): Is the voice distinctive?\n\nProvide at least {targetComments} specific, craft-focused comments.\n\nStory:\n{content}',
    true
),
(
    'Quick Polish Coach',
    'Fast, focused feedback on grammar, style, and clarity - perfect for final edits',
    'quick_polish',
    '["grammar", "clarity", "conciseness", "style"]'::jsonb,
    '["word_choice", "sentence_structure", "clarity"]'::jsonb,
    20,
    'You are an expert editor focused on polishing writing to perfection. Catch grammar errors, suggest clearer phrasing, eliminate redundancy, and improve sentence flow.',
    'Provide quick, focused edits for:\n\n1. GRAMMAR & MECHANICS (30%)\n2. CLARITY (25%)\n3. CONCISENESS (25%)\n4. STYLE & FLOW (20%)\n\nProvide at least {targetComments} specific fixes.\n\nText:\n{content}',
    true
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_comments_composite ON ai_comments(user_id, document_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_composite ON ai_comment_feedback(comment_id, action, created_at);
CREATE INDEX IF NOT EXISTS idx_patterns_composite ON ai_learning_patterns(user_id, pattern_type, confidence_score);

-- Add updated_at trigger for ai_comments
CREATE OR REPLACE FUNCTION update_ai_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_comments_updated_at
    BEFORE UPDATE ON ai_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_comments_updated_at();

-- Add updated_at trigger for ai_coaching_prompts
CREATE TRIGGER ai_coaching_prompts_updated_at
    BEFORE UPDATE ON ai_coaching_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_comments_updated_at();

COMMENT ON TABLE ai_comments IS 'Stores all AI-generated comments with full context and metadata';
COMMENT ON TABLE ai_comment_feedback IS 'Tracks user actions on comments for learning and improvement';
COMMENT ON TABLE ai_learning_patterns IS 'Stores learned patterns from user behavior for personalized suggestions';
COMMENT ON TABLE ai_coaching_prompts IS 'Templates for different coaching styles and document types';
COMMENT ON TABLE ai_comment_sessions IS 'Tracks comment generation sessions for analytics';
