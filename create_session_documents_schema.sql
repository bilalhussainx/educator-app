-- ================================================================
-- SESSION DOCUMENTS MANAGEMENT SCHEMA
-- ================================================================
-- Dedicated document storage for urgent and live essay sessions
-- Organizes drafts and final versions by session name and document type

-- Session Documents Table
CREATE TABLE IF NOT EXISTS session_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL, -- Links to session identifier
    session_name VARCHAR(255) NOT NULL, -- Human-readable session name
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('urgent_essay', 'live_tutorial', 'scribe_session', 'video_session')),

    -- Document Information
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('draft', 'final', 'revision', 'backup')),
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text/plain', -- MIME type

    -- File Metadata
    file_size INTEGER DEFAULT 0, -- Size in bytes
    word_count INTEGER DEFAULT 0,
    character_count INTEGER DEFAULT 0,

    -- Version Information
    version_number INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT true,
    parent_document_id UUID REFERENCES session_documents(id), -- For version history

    -- Session Context
    session_metadata JSONB DEFAULT '{}', -- Store session-specific data
    ai_analysis_data JSONB DEFAULT '{}', -- MozartStroke or other AI analysis results

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Soft Delete
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Indexing
    UNIQUE(user_id, session_id, document_name, version_number)
);

-- Session Document Tags (for better organization)
CREATE TABLE IF NOT EXISTS session_document_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES session_documents(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    tag_color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(document_id, tag_name)
);

-- Session Document Sharing (for teacher access)
CREATE TABLE IF NOT EXISTS session_document_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES session_documents(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) DEFAULT 'read' CHECK (permission_level IN ('read', 'comment', 'edit')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(document_id, shared_with_user_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_session_documents_user_session ON session_documents(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_session_documents_session_type ON session_documents(session_type);
CREATE INDEX IF NOT EXISTS idx_session_documents_current_version ON session_documents(user_id, is_current_version) WHERE is_current_version = true;
CREATE INDEX IF NOT EXISTS idx_session_documents_created_at ON session_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_documents_session_name ON session_documents(session_name);
CREATE INDEX IF NOT EXISTS idx_session_document_tags_name ON session_document_tags(tag_name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER session_documents_updated_at
    BEFORE UPDATE ON session_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_session_document_updated_at();

-- Function to calculate document statistics
CREATE OR REPLACE FUNCTION calculate_document_stats(content_text TEXT)
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'character_count', LENGTH(content_text),
        'word_count', array_length(string_to_array(trim(content_text), ' '), 1),
        'paragraph_count', array_length(string_to_array(trim(content_text), E'\n\n'), 1),
        'line_count', array_length(string_to_array(content_text, E'\n'), 1)
    );
END;
$$ LANGUAGE plpgsql;

-- View for easy document retrieval with statistics
CREATE OR REPLACE VIEW session_documents_with_stats AS
SELECT
    sd.*,
    u.username,
    u.display_name,
    COUNT(sdt.id) as tag_count,
    ARRAY_AGG(sdt.tag_name) FILTER (WHERE sdt.tag_name IS NOT NULL) as tags,
    COUNT(sds.id) as share_count,
    CASE
        WHEN sd.updated_at > NOW() - INTERVAL '1 hour' THEN 'recently_updated'
        WHEN sd.updated_at > NOW() - INTERVAL '1 day' THEN 'today'
        WHEN sd.updated_at > NOW() - INTERVAL '1 week' THEN 'this_week'
        ELSE 'older'
    END as recency_category
FROM session_documents sd
LEFT JOIN users u ON sd.user_id = u.id
LEFT JOIN session_document_tags sdt ON sd.id = sdt.document_id
LEFT JOIN session_document_shares sds ON sd.id = sds.document_id
WHERE sd.is_deleted = false
GROUP BY sd.id, u.username, u.display_name;

-- Sample Data for Testing
INSERT INTO session_documents (user_id, session_id, session_name, session_type, document_name, document_type, content, word_count, character_count) VALUES
((SELECT id FROM users LIMIT 1), 'urgent-essay-001', 'College Application Essay - Draft 1', 'urgent_essay', 'Personal Statement Draft', 'draft', 'This is my draft college application essay about overcoming challenges...', 156, 892),
((SELECT id FROM users LIMIT 1), 'urgent-essay-001', 'College Application Essay - Final', 'urgent_essay', 'Personal Statement Final', 'final', 'This is my final college application essay about overcoming challenges and personal growth...', 203, 1247),
((SELECT id FROM users LIMIT 1), 'live-tutorial-002', 'Python Programming Session', 'live_tutorial', 'Code Examples', 'draft', 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)', 23, 145);

COMMENT ON TABLE session_documents IS 'Stores all documents from urgent and live essay sessions with versioning';
COMMENT ON TABLE session_document_tags IS 'Tags for organizing and categorizing session documents';
COMMENT ON TABLE session_document_shares IS 'Sharing permissions for session documents between users';