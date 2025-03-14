-- Add market column to trades table
ALTER TABLE trades ADD COLUMN market text NOT NULL DEFAULT 'US';

-- Add check constraint to ensure market is either 'US' or 'IN'
ALTER TABLE trades ADD CONSTRAINT trades_market_check CHECK (market IN ('US', 'IN'));
