-- Create user_wallets table for Spark system and tier management
CREATE TABLE IF NOT EXISTS user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    spark_balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    total_earned DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    total_spent DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create index for faster tier lookups
CREATE INDEX IF NOT EXISTS idx_user_wallets_balance ON user_wallets(spark_balance);

-- Create transaction log table for Spark activities
CREATE TABLE IF NOT EXISTS spark_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'earned', 'spent', 'gift_received', 'gift_sent'
    description TEXT,
    related_activity VARCHAR(100), -- 'course_completion', 'mentor_session', 'community_help', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster transaction queries
CREATE INDEX IF NOT EXISTS idx_spark_transactions_user ON spark_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_spark_transactions_type ON spark_transactions(transaction_type);

-- Insert default wallet for existing users
INSERT INTO user_wallets (user_id, spark_balance, total_earned, total_spent)
SELECT id, 0.00, 0.00, 0.00
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_wallets)
ON CONFLICT (user_id) DO NOTHING;