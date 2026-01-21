-- =================================================================
-- ESSAY COLLABORATION SYSTEM: Create Tables for Human-in-the-Loop
-- Multi-Agent Essay Writing with Teacher-Student Collaboration
-- =================================================================
-- This migration creates the database schema for the collaborative
-- essay writing system with LangGraph pipeline integration
--
-- NOTE: Uses 'essay_collab_' prefix to avoid conflicts with existing
-- essay_collaboration_sessions table used for Liveblocks sync

BEGIN;

-- =================================================================
-- TABLE: essay_collab_sessions
-- Main session table linking teacher and student for essay work
-- =================================================================
CREATE TABLE IF NOT EXISTS essay_collab_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    essay_prompt TEXT NOT NULL,
    university VARCHAR(255),
    essay_type VARCHAR(50) DEFAULT 'common_app',
    target_word_count INTEGER DEFAULT 650,

    -- Participants
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Status tracking
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    current_stage VARCHAR(30) DEFAULT 'not_started' CHECK (current_stage IN (
        'not_started', 'topic_analysis', 'research', 'outline', 'draft', 'editing', 'polish', 'complete'
    )),

    -- LangGraph integration
    langgraph_thread_id VARCHAR(255),
    langgraph_checkpoint_id VARCHAR(255),

    -- Student profile snapshot (for AI context)
    student_profile JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- =================================================================
-- TABLE: essay_collab_stage_states
-- Human-in-the-loop checkpoints - stores agent output and approval status
-- =================================================================
CREATE TABLE IF NOT EXISTS essay_collab_stage_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES essay_collab_sessions(id) ON DELETE CASCADE,

    stage VARCHAR(30) NOT NULL,
    stage_order INTEGER NOT NULL, -- 1-6 for ordering

    -- Agent output
    agent_output JSONB NOT NULL, -- Structured output from the agent
    agent_model VARCHAR(100), -- Which model produced this
    agent_duration_ms INTEGER, -- How long the agent took

    -- Human-in-the-loop
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'approved', 'rejected', 'revision_requested'
    )),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Feedback from both parties
    teacher_feedback TEXT,
    student_feedback TEXT,

    -- If edited before approval
    edited_output JSONB,
    edited_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one state per stage per session (latest wins on updates)
    UNIQUE(session_id, stage)
);

-- =================================================================
-- TABLE: essay_collab_drafts
-- Version history of essay content
-- =================================================================
CREATE TABLE IF NOT EXISTS essay_collab_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES essay_collab_sessions(id) ON DELETE CASCADE,

    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER,

    -- Which stage produced this
    source_stage VARCHAR(30),

    -- Who made this version (null = agent)
    created_by UUID REFERENCES users(id),
    creation_type VARCHAR(20) DEFAULT 'agent' CHECK (creation_type IN ('agent', 'teacher_edit', 'student_edit', 'collaborative')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(session_id, version)
);

-- =================================================================
-- TABLE: essay_collab_comments
-- Inline comments on essay text
-- =================================================================
CREATE TABLE IF NOT EXISTS essay_collab_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES essay_collab_sessions(id) ON DELETE CASCADE,
    draft_id UUID REFERENCES essay_collab_drafts(id) ON DELETE SET NULL,

    user_id UUID NOT NULL REFERENCES users(id),

    -- Position in text
    selection_start INTEGER,
    selection_end INTEGER,
    selected_text TEXT, -- Snapshot of selected text

    -- Comment content
    content TEXT NOT NULL,
    comment_type VARCHAR(20) DEFAULT 'comment' CHECK (comment_type IN ('comment', 'suggestion', 'question', 'praise')),

    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- TABLE: essay_collab_messages
-- Chat messages and system events within a session
-- =================================================================
CREATE TABLE IF NOT EXISTS essay_collab_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES essay_collab_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- null for system messages

    message_type VARCHAR(30) DEFAULT 'chat' CHECK (message_type IN (
        'chat',             -- Regular teacher/student chat
        'system',           -- System notifications
        'agent_started',    -- Agent began processing
        'agent_output',     -- Agent produced output
        'approval_request', -- Checkpoint reached
        'approval_response', -- Approved/rejected
        'stage_transition'  -- Moving to next stage
    )),

    content TEXT NOT NULL,
    metadata JSONB, -- Extra data depending on message_type

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- INDEXES for performance
-- =================================================================

-- Session lookups by user
CREATE INDEX IF NOT EXISTS idx_essay_collab_sessions_teacher ON essay_collab_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_essay_collab_sessions_student ON essay_collab_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_essay_collab_sessions_status ON essay_collab_sessions(status);
CREATE INDEX IF NOT EXISTS idx_essay_collab_sessions_created ON essay_collab_sessions(created_at DESC);

-- Stage states lookups
CREATE INDEX IF NOT EXISTS idx_essay_collab_stage_states_session ON essay_collab_stage_states(session_id);
CREATE INDEX IF NOT EXISTS idx_essay_collab_stage_states_pending ON essay_collab_stage_states(session_id) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_essay_collab_stage_states_stage ON essay_collab_stage_states(session_id, stage_order);

-- Draft lookups
CREATE INDEX IF NOT EXISTS idx_essay_collab_drafts_session ON essay_collab_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_essay_collab_drafts_version ON essay_collab_drafts(session_id, version DESC);

-- Comment lookups
CREATE INDEX IF NOT EXISTS idx_essay_collab_comments_session ON essay_collab_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_essay_collab_comments_unresolved ON essay_collab_comments(session_id) WHERE resolved = FALSE;

-- Message lookups
CREATE INDEX IF NOT EXISTS idx_essay_collab_messages_session ON essay_collab_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_essay_collab_messages_created ON essay_collab_messages(session_id, created_at DESC);

-- =================================================================
-- TRIGGERS for updated_at timestamps
-- =================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_essay_collab_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for essay_collab_sessions
DROP TRIGGER IF EXISTS trigger_essay_collab_sessions_updated ON essay_collab_sessions;
CREATE TRIGGER trigger_essay_collab_sessions_updated
    BEFORE UPDATE ON essay_collab_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_essay_collab_updated_at();

-- Trigger for essay_collab_stage_states
DROP TRIGGER IF EXISTS trigger_essay_collab_stage_states_updated ON essay_collab_stage_states;
CREATE TRIGGER trigger_essay_collab_stage_states_updated
    BEFORE UPDATE ON essay_collab_stage_states
    FOR EACH ROW
    EXECUTE FUNCTION update_essay_collab_updated_at();

-- Trigger for essay_collab_comments
DROP TRIGGER IF EXISTS trigger_essay_collab_comments_updated ON essay_collab_comments;
CREATE TRIGGER trigger_essay_collab_comments_updated
    BEFORE UPDATE ON essay_collab_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_essay_collab_updated_at();

-- =================================================================
-- COMMENTS for documentation
-- =================================================================

COMMENT ON TABLE essay_collab_sessions IS 'Main table for collaborative essay writing sessions between teacher and student';
COMMENT ON TABLE essay_collab_stage_states IS 'Human-in-the-loop checkpoints storing agent outputs and approval status for each pipeline stage';
COMMENT ON TABLE essay_collab_drafts IS 'Version history of essay content with source tracking';
COMMENT ON TABLE essay_collab_comments IS 'Inline comments and suggestions on essay text';
COMMENT ON TABLE essay_collab_messages IS 'Chat messages and system events within essay collaboration sessions';

COMMENT ON COLUMN essay_collab_sessions.langgraph_thread_id IS 'LangGraph thread ID for state persistence';
COMMENT ON COLUMN essay_collab_sessions.langgraph_checkpoint_id IS 'Current LangGraph checkpoint ID';
COMMENT ON COLUMN essay_collab_sessions.current_stage IS 'Current stage in the 6-stage pipeline';

COMMENT ON COLUMN essay_collab_stage_states.stage_order IS '1=topic_analysis, 2=research, 3=outline, 4=draft, 5=editing, 6=polish';
COMMENT ON COLUMN essay_collab_stage_states.approval_status IS 'pending=waiting for teacher approval, approved=can proceed, revision_requested=agent will retry';

COMMIT;

-- =================================================================
-- VERIFICATION QUERIES
-- =================================================================
-- Run these to verify the migration:
--
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name LIKE 'essay_collab_%' AND table_schema = 'public';
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'essay_collab_sessions';
