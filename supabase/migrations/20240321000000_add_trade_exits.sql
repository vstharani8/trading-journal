-- Create trade_exits table
CREATE TABLE IF NOT EXISTS trade_exits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  exit_date DATE NOT NULL,
  exit_price DECIMAL NOT NULL,
  quantity DECIMAL NOT NULL,
  fees DECIMAL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS trade_exits_trade_id_idx ON trade_exits(trade_id);
CREATE INDEX IF NOT EXISTS trade_exits_user_id_idx ON trade_exits(user_id);
CREATE INDEX IF NOT EXISTS trade_exits_exit_date_idx ON trade_exits(exit_date);

-- Enable Row Level Security
ALTER TABLE trade_exits ENABLE ROW LEVEL SECURITY;

-- Create policies for trade_exits
CREATE POLICY "Users can view their own trade exits"
  ON trade_exits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trade exits"
  ON trade_exits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trade exits"
  ON trade_exits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade exits"
  ON trade_exits FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_trade_exits_updated_at
  BEFORE UPDATE ON trade_exits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update trade status and remaining quantity
CREATE OR REPLACE FUNCTION update_trade_on_exit()
RETURNS TRIGGER AS $$
BEGIN
  -- Update remaining quantity
  UPDATE trades
  SET 
    remaining_quantity = CASE 
      WHEN t.remaining_quantity IS NULL THEN t.quantity - NEW.quantity
      ELSE t.remaining_quantity - NEW.quantity
    END,
    average_exit_price = (
      SELECT COALESCE(
        SUM(exit_price * quantity) / NULLIF(SUM(quantity), 0),
        NULL
      )
      FROM trade_exits
      WHERE trade_id = NEW.trade_id
    ),
    status = CASE 
      WHEN t.remaining_quantity - NEW.quantity <= 0 THEN 'closed'
      ELSE 'open'
    END
  FROM trades t
  WHERE t.id = NEW.trade_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trade updates on exit
CREATE TRIGGER update_trade_on_exit_trigger
  AFTER INSERT OR UPDATE ON trade_exits
  FOR EACH ROW
  EXECUTE FUNCTION update_trade_on_exit();

-- Add foreign key relationship for trade_exits in trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS trade_exits UUID[];
COMMENT ON COLUMN trades.trade_exits IS 'Array of trade exit IDs'; 