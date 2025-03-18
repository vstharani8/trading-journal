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
DECLARE
  total_exit_quantity DECIMAL;
BEGIN
  -- Calculate total exit quantity including the new exit
  SELECT COALESCE(SUM(quantity), 0) + NEW.quantity
  INTO total_exit_quantity
  FROM trade_exits
  WHERE trade_id = NEW.trade_id AND id != NEW.id;

  -- Update remaining quantity
  UPDATE trades t
  SET 
    remaining_quantity = t.quantity - total_exit_quantity,
    average_exit_price = (
      SELECT COALESCE(
        SUM(exit_price * quantity) / NULLIF(SUM(quantity), 0),
        NULL
      )
      FROM trade_exits
      WHERE trade_id = NEW.trade_id
    ),
    status = CASE 
      WHEN total_exit_quantity >= t.quantity THEN 'closed'
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

-- Create function to handle trade exit deletions
CREATE OR REPLACE FUNCTION update_trade_on_exit_delete()
RETURNS TRIGGER AS $$
DECLARE
  total_exit_quantity DECIMAL;
BEGIN
  -- Calculate total exit quantity excluding the deleted exit
  SELECT COALESCE(SUM(quantity), 0)
  INTO total_exit_quantity
  FROM trade_exits
  WHERE trade_id = OLD.trade_id AND id != OLD.id;

  -- Update the trade when an exit is deleted
  UPDATE trades t
  SET 
    remaining_quantity = t.quantity - total_exit_quantity,
    average_exit_price = CASE 
      WHEN total_exit_quantity = 0 THEN NULL
      ELSE (
        SELECT COALESCE(
          SUM(exit_price * quantity) / NULLIF(SUM(quantity), 0),
          NULL
        )
        FROM trade_exits
        WHERE trade_id = OLD.trade_id AND id != OLD.id
      )
    END,
    status = CASE 
      WHEN total_exit_quantity >= t.quantity THEN 'closed'
      ELSE 'open'
    END
  WHERE t.id = OLD.trade_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trade updates on exit deletion
CREATE TRIGGER update_trade_on_exit_delete_trigger
  AFTER DELETE ON trade_exits
  FOR EACH ROW
  EXECUTE FUNCTION update_trade_on_exit_delete();

-- Add foreign key relationship for trade_exits in trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS trade_exits UUID[];
COMMENT ON COLUMN trades.trade_exits IS 'Array of trade exit IDs'; 