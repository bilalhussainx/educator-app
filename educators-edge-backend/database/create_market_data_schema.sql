-- Market Data Schema for Historical Trading Simulation
-- This schema stores daily OHLCV data for various stocks across different time periods

-- Create market_data_daily table if it doesn't exist
CREATE TABLE IF NOT EXISTS market_data_daily (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    open_price DECIMAL(10,4) NOT NULL,
    high_price DECIMAL(10,4) NOT NULL,
    low_price DECIMAL(10,4) NOT NULL,
    close_price DECIMAL(10,4) NOT NULL,
    adjusted_close_price DECIMAL(10,4),
    volume BIGINT NOT NULL,
    dividend_amount DECIMAL(10,4) DEFAULT 0,
    split_coefficient DECIMAL(10,6) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique symbol-date combinations
    UNIQUE(symbol, date)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON market_data_daily(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_date ON market_data_daily(date);
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_date ON market_data_daily(symbol, date);
CREATE INDEX IF NOT EXISTS idx_market_data_date_range ON market_data_daily(date, symbol) WHERE date >= '1920-01-01';

-- Create table to track data availability by symbol and date range
CREATE TABLE IF NOT EXISTS market_data_coverage (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_records INTEGER NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_source VARCHAR(50) DEFAULT 'alpha_vantage',
    
    UNIQUE(symbol, start_date, end_date)
);

-- Create table for simulation sessions to track user progress
CREATE TABLE IF NOT EXISTS simulation_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    session_name VARCHAR(255),
    historical_period VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    current_date DATE NOT NULL,
    end_date DATE NOT NULL,
    simulation_speed DECIMAL(3,1) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT FALSE,
    portfolio_value DECIMAL(12,2) DEFAULT 100000.00,
    cash_balance DECIMAL(12,2) DEFAULT 100000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for simulation portfolio holdings
CREATE TABLE IF NOT EXISTS simulation_holdings (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL,
    average_cost DECIMAL(10,4) NOT NULL,
    current_price DECIMAL(10,4),
    market_value DECIMAL(12,2),
    unrealized_pnl DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(session_id, symbol)
);

-- Create table for simulation transactions
CREATE TABLE IF NOT EXISTS simulation_transactions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL, -- 'BUY' or 'SELL'
    quantity INTEGER NOT NULL,
    price DECIMAL(10,4) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    commission DECIMAL(8,2) DEFAULT 0,
    transaction_date DATE NOT NULL,
    simulation_date DATE NOT NULL, -- Date in simulation timeline
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for simulation tables
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_user ON simulation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_period ON simulation_sessions(historical_period);
CREATE INDEX IF NOT EXISTS idx_simulation_holdings_session ON simulation_holdings(session_id);
CREATE INDEX IF NOT EXISTS idx_simulation_transactions_session ON simulation_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_simulation_transactions_date ON simulation_transactions(simulation_date);

-- Insert some sample historical periods metadata
INSERT INTO simulation_sessions (session_name, historical_period, start_date, current_date, end_date) 
VALUES 
    ('Great Depression Demo', 'great-depression', '1929-01-01', '1929-09-01', '1933-12-31'),
    ('2008 Crisis Demo', '2008-crisis', '2007-01-01', '2007-06-01', '2009-12-31'),
    ('Dot-Com Bubble Demo', 'dot-com-bubble', '1995-01-01', '1999-01-01', '2002-12-31'),
    ('COVID Crash Demo', 'covid-crash', '2020-01-01', '2020-01-01', '2021-12-31'),
    ('Black Monday Demo', 'black-monday', '1987-01-01', '1987-08-01', '1988-12-31'),
    ('Modern Bull Demo', 'modern-bull', '2009-03-09', '2009-03-09', '2020-02-19')
ON CONFLICT DO NOTHING;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_market_data_daily_updated_at BEFORE UPDATE ON market_data_daily 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_simulation_sessions_updated_at BEFORE UPDATE ON simulation_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_simulation_holdings_updated_at BEFORE UPDATE ON simulation_holdings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();