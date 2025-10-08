-- =================================================================
-- ZENITH TRADE : DATABASE SCHEMA MIGRATION
-- =================================================================

-- STEP 1: Create a 'user_wallets' table if it doesn't exist
-- This will hold both Spark and the new trading cash balance.
CREATE TABLE IF NOT EXISTS user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    spark_balance INT NOT NULL DEFAULT 100,
    trading_cash_balance DECIMAL(19, 4) NOT NULL DEFAULT 10000.00, -- The "fake money"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);

-- STEP 2: Create the 'portfolios' table
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    -- The portfolio's value will be calculated, not stored.
    p_score FLOAT NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

-- STEP 3: Create the 'portfolio_assets' table to track holdings
CREATE TABLE IF NOT EXISTS portfolio_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(10) NOT NULL,
    quantity DECIMAL(19, 4) NOT NULL,
    average_cost_basis DECIMAL(19, 4) NOT NULL,
    UNIQUE (portfolio_id, asset_symbol)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_portfolio_id ON portfolio_assets(portfolio_id);

-- STEP 4: Create the 'trades' table as an immutable log
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(10) NOT NULL,
    trade_type VARCHAR(4) NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
    quantity DECIMAL(19, 4) NOT NULL,
    fill_price DECIMAL(19, 4) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trades_portfolio_id ON trades(portfolio_id);