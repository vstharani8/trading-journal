-- Add new columns to trades table without dropping existing ones
ALTER TABLE trades 
  ADD COLUMN IF NOT EXISTS remaining_quantity DECIMAL,
  ADD COLUMN IF NOT EXISTS average_exit_price DECIMAL;

-- Initialize remaining_quantity with position_size for existing trades
UPDATE trades
SET remaining_quantity = quantity
WHERE remaining_quantity IS NULL;

-- Initialize average_exit_price with exit_price for closed trades
UPDATE trades
SET average_exit_price = exit_price
WHERE status = 'closed' AND average_exit_price IS NULL; 