-- Create tables for the Ascendia tier-based communication system

-- Direct messages table
CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(200),
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    is_read BOOLEAN DEFAULT FALSE
);

-- Create indexes for direct messages
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON direct_messages(recipient_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON direct_messages(recipient_id, is_read);

-- Session requests table
CREATE TABLE IF NOT EXISTS session_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL, -- 'networking', 'mentoring', 'code_review', etc.
    duration INTEGER DEFAULT 30, -- Duration in minutes
    preferred_time TIMESTAMP,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'completed'
    is_free BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(20), -- 'z_credits', 'stripe', 'paypal'
    z_credits_cost DECIMAL(10, 2) DEFAULT 0.00,
    real_money_cost DECIMAL(10, 2) DEFAULT 0.00,
    session_url VARCHAR(500), -- For video call links
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for session requests
CREATE INDEX IF NOT EXISTS idx_session_requests_requester ON session_requests(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_session_requests_mentor ON session_requests(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_session_requests_status ON session_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_session_requests_free ON session_requests(is_free, status);